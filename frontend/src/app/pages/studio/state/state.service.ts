import { computed, Injectable, signal } from "@angular/core";
import { Author, ProjectMetadata, ProjectState, ProjectStudio } from "@shared/types";
import { Command, HistoryService } from "../services/history.service";

import { AppAuthService } from "@src/app/services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { combineLatest, filter, take } from "rxjs";
import axios from "axios";
import { AudioCacheService } from "../services/audio-cache.service";
import { DeepPartial, ObjectStateNode, objectStateNode, propStateNode, StateNode } from "./state.factory";
import { ObjectScaffold, Scaffold, STATE_SCAFFOLD } from "./state.scaffolds";
import { UserService } from "@src/app/services/user.service";
import { environment } from "@src/environments/environment.dev";
import { ApiService } from "@src/app/services/api.service";


const nullAuthor: Author = {
	userId: "",
	displayName: "",
}

const SESSION_STORAGE_KEY = 'synthia_guest_project_state';

@Injectable()
export class StateService { // SINGLETON
	private static _instance: StateService;
	static get instance(): StateService { return StateService._instance; }

	declare state : ObjectStateNode<ProjectState>;
	public isStateReady = signal<boolean>(false);

	declare projectId : string | null;
	declare isNew : boolean;
	declare isSignedOut : boolean;
	declare hasSessionStorageData : boolean;

	constructor(
		private auth: AppAuthService,
		private auth0: AuthService,
		private userService: UserService,
		private route: ActivatedRoute,
		private router: Router,

		private historyService: HistoryService,
		private audioCacheService: AudioCacheService,
	) {		
		StateService._instance = this;
		
		// Check for existing sessionStorage data
		this.hasSessionStorageData = !!this.loadFromSessionStorage();
				
		combineLatest([
			this.route.paramMap,
			this.route.queryParams,
		]).pipe(
			filter(([params, queryParams]) => {
				const projectId = params.get('projectId');
				const isNew = queryParams['isNew'];
				return !!(projectId);
			}),
			take(1)
		).subscribe(async ([params, queryParams]) => {
			this.projectId = params.get('projectId');
			this.isNew = queryParams['isNew']==='true';

			const author = await this.userService.waitForAuthor();

			this.isSignedOut = !author;
			this.initState(author ?? nullAuthor, this.projectId!, this.isNew!)
		});
	}

	projectDuration = computed(() => {
		return this.state.studio.tracks().reduce((max, track) => {
			return Math.max(max, track.regions().reduce((regionMax, region) => {
				return Math.max(regionMax, region.start() + region.duration());
				}, 0));
		}, 0); 
	});

	// ==============================================================================================
	// SessionStorage Methods

	private saveToSessionStorage(state: ProjectState): void {
		try {
			sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
			console.log('State saved to sessionStorage for guest user');
		} catch (error) {
			console.error('Failed to save state to sessionStorage:', error);
		}
	}

	private loadFromSessionStorage(): ProjectState | null {
		try {
			const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
			if (stored) {
				const state = JSON.parse(stored) as ProjectState;
				console.log('State loaded from sessionStorage for guest user');
				return state;
			}
		} catch (error) {
			console.error('Failed to load state from sessionStorage:', error);
		}
		return null;
	}

	private clearSessionStorage(): void {
		try {
			sessionStorage.removeItem(SESSION_STORAGE_KEY);
			console.log('SessionStorage cleared');
		} catch (error) {
			console.error('Failed to clear sessionStorage:', error);
		}
	}

	// ==============================================================================================
	// Methods

	async initState(author: Author, projectId: string, isNew: boolean) {
		// Check if user is not authenticated and has sessionStorage data
		if (this.isSignedOut) {
			console.log("signed out")
			const sessionData = this.loadFromSessionStorage();
			if (sessionData) {
				// Restore from sessionStorage
				this.hasSessionStorageData = true;
				this.createState(STATE_SCAFFOLD, sessionData);
				this.isStateReady.set(true);
				this.audioCacheService.initialize();
				return;
			}
		}

		// Check if user is now authenticated and has sessionStorage data to restore
		if (!this.isSignedOut && this.hasSessionStorageData) {
			const sessionData = this.loadFromSessionStorage();
			if (sessionData) {
				// Update the author information in the restored state
				const updatedState = {
					...sessionData,
					metadata: {
						...sessionData.metadata,
						authors: [author],
					}
				};
				this.createState(STATE_SCAFFOLD, updatedState);
				this.isStateReady.set(true);
				await this.audioCacheService.initialize();

				this.clearSessionStorage();
				this.hasSessionStorageData = false;

				console.log("Syncing session data to backend...");
				
				// Sync audio files first
				try {
					await this.audioCacheService.syncSessionAudioFilesToBackend();
					console.log("Audio files synced successfully");
				} catch (err) {
					console.error("Failed to sync audio files:", err);
				}

				// Then save the state
				console.log("Saving state to backend...");
				await this.saveState();
				return;
			}
		}

		if (isNew) {
			const scaffold = STATE_SCAFFOLD;
			const overrides = {
				metadata: {
					projectId: projectId,
					authors: [author],
				}
			}

			this.createState(scaffold, overrides);
		} else {
			const scaffold = STATE_SCAFFOLD;
			const overrides = await this.loadState(projectId);

			this.createState(scaffold, overrides);
		}

		// NOTIFY OTHER SERVICES

		this.isStateReady.set(true);
		this.audioCacheService.initialize();
	}

	async loadState(projectId: string) {
		try {
			const res = await ApiService.instance.routes.getStudio({}, projectId);
			return res.data.state;
		} catch (err) {
			throw err;
		}
	}

	async saveState() { 
		if (this.isSignedOut) {
			// Save to sessionStorage for unauthenticated users
			const stateSnapshot = this.state.snapshot() as ProjectState;
			this.saveToSessionStorage(stateSnapshot);
			this.hasSessionStorageData = true;
			
			// Trigger auth flow
			const currentUrl = window.location.pathname + window.location.search;
			this.auth0.loginWithRedirect({
				appState: { target: currentUrl }
			});
			return true;
		}

		const pendingCommands = this.historyService.getPendingCommandsAndClear();

		try {
			if (this.isNew) {
				const res = await ApiService.instance.routes.saveStudioNew({ 
					data: { 
						projectId: this.projectId, 
						state: this.state.snapshot() as ProjectState 
					} 
				});

				if (res.data.success) {
					this.isNew = false;
					this.router.navigate([], {
						relativeTo: this.route,
						queryParams: {},
						replaceUrl: true
					});
					// Clear sessionStorage after successful save
					this.clearSessionStorage();
				}
				return res.data.success;
			} else {
				const res = await ApiService.instance.routes.saveStudioOverwrite({ 
					data: { 
						projectId: this.projectId, 
						state: this.state.snapshot() as ProjectState 
					}
				}, this.projectId!);
				
				// Clear sessionStorage after successful save
				if (res.data.success) {
					this.clearSessionStorage();
				}
				return res.data.success;
			}
		} catch (err) {
			this.historyService.fillPendingCommands(pendingCommands);
			throw err;
		}
	}

	createState(scaffold: ObjectScaffold<ProjectState>, state: DeepPartial<ProjectState>) {
		this.state = objectStateNode<ProjectState>(scaffold, state) as ObjectStateNode<ProjectState>;
	}
}
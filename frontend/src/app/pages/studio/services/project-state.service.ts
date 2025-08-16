import { Injectable, signal, computed, Injector } from '@angular/core';
import { ProjectStudio } from '@shared/types'

import { HistoryService, PatchEntry } from './history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';

import axios from 'axios';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, filter, take } from 'rxjs';

import { Author } from '@shared/types';
import { applyPatches } from 'immer';

import { DEFAULT_STATE, ProjectStateGlobals, ProjectStateMetadata, ProjectStateTracks } from './substates';


@Injectable()
export class ProjectState {
	declare metadataState : ProjectStateMetadata;
	declare globalsState : ProjectStateGlobals;
	declare tracksState : ProjectStateTracks;

	declare substateMap : Record<string, any>;

	declare projectId : string | null;
	declare isNew : boolean;

	public isStateReady = signal<boolean>(false);

	constructor(
		private injector: Injector,
		private historyService: HistoryService,
		private auth: AppAuthService,
		private route: ActivatedRoute,
		private router: Router,
	) {
		historyService.registerProjectState(this);
		
		combineLatest([
			this.route.paramMap,
			this.route.queryParams,
			this.auth.getAuthor$(),
		]).pipe(
			filter(([params, queryParams, author]) => {
				const projectId = params.get('projectId');
				const isNew = queryParams['isNew'];
				return !!(projectId && author);
			}),
			take(1)
		).subscribe(([params, queryParams, author]) => {
			this.projectId = params.get('projectId');
			this.isNew = queryParams['isNew']==='true';
			
			this.initState(author!, this.projectId!, this.isNew!)
		});
	}
	
	readonly state = computed<ProjectStudio>(() => {
		return {
			metadata: this.metadataState.snapshot(),
			globals: this.globalsState.snapshot(),
			tracks: this.tracksState.snapshot(),
		};
	});
	
	async initState(author: Author, projectId: string, isNew: boolean) {
		if (isNew) {
			const initialState = DEFAULT_STATE;
			initialState.metadata.projectId = projectId,
			initialState.metadata.authors = [author],

			this.metadataState = new ProjectStateMetadata(this.injector, this.historyService, initialState.metadata);
			this.globalsState = new ProjectStateGlobals(this.injector, this.historyService, initialState.globals);
			this.tracksState = new ProjectStateTracks(this.injector, this.historyService, initialState.tracks);
		} else {
			const initialState = await this.loadState(projectId);
	
			this.metadataState = new ProjectStateMetadata(this.injector, this.historyService, initialState.metadata);
			this.globalsState = new ProjectStateGlobals(this.injector, this.historyService, initialState.globals);
			this.tracksState = new ProjectStateTracks(this.injector, this.historyService, initialState.tracks);
		}

		this.substateMap = {
			'metadata': this.metadataState,
			'globals': this.globalsState,
			'tracks': this.tracksState,
		}
		this.isStateReady.set(true);
	}
	
	async saveState() { 
		const patchEntries: PatchEntry[] = this.historyService.getPendingEntriesAndClear();
			
		try {
			if (this.isNew) {
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_new', 
					{ 
						state: this.state(), 
					},
					{
						headers: {
							Authorization: `Bearer ${token}`
						}
					}
				);

				if (res.data.success) {
					this.isNew = false;
					this.router.navigate([], {
						relativeTo: this.route,
						queryParams: {},
						replaceUrl: true
					});
				}
				return res.data.success;
			} else {
				if (patchEntries.length === 0) { return true; }

				const patches = patchEntries.flatMap(entry => {
					if (!entry.patches) return [];
					return entry.patches.map(patch => ({
						...patch,
						path: [entry.substate, ...patch.path],
					}));
				});

				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_existing', 
					{ 
						projectId: this.projectId, 
						patches: patches, 
					},
					{
						headers: {
							Authorization: `Bearer ${token}`
						}
					}
				);
				return res.data.success;
			}
		} catch (err) {
			this.historyService.fillPendingEntries(patchEntries);
			throw err;
		}
	}

	async loadState(projectId: string, applyImmediately: boolean = false) {
		try {
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');

			const res = await axios.post<{ state: ProjectStudio }>(
				'/api/projects/load', 
				{ 
					projectId: projectId, 
				},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);
			
			if (applyImmediately) {
				this.applyState(res.data.state);
			}
			return res.data.state;

		} catch (err) {
			throw err;
		}
	}

	applyState(state: ProjectStudio) {
		const stateMetadata = state.metadata;
		const stateGlobals = state.globals;
		const stateTracks = state.tracks;

		for (const [key, value] of Object.entries(stateMetadata)) {
			if ((this.metadataState as any)[key]?.set) {
				(this.metadataState as any)[key].set(value);
			}
		}
		for (const [key, value] of Object.entries(stateGlobals)) {
			if ((this.globalsState as any)[key]?.set) {
				(this.globalsState as any)[key].set(value);
			}
		}
		for (const [key, value] of Object.entries(stateTracks)) {
			if ((this.tracksState as any)[key]?.set) {
				(this.tracksState as any)[key].set(value);
			}
		}
	}

	applyPatchEntry(patch: PatchEntry, invert: boolean = false) {
		const patches = invert ? patch.inversePatches : patch.patches;
		if (!patches || patches.length === 0) return;

		const substateName = patch.substate;
		const substate = this.substateMap[substateName];

		const changedKeys = new Set<string>();
		patches.forEach(p => {
			if (p.path.length >= 1) {
				changedKeys.add(p.path[0] as string);
			}
		});

		if (changedKeys.size > 0) {
			const current = substate.snapshot();
			const next = applyPatches(current, patches);

			changedKeys.forEach(key => {
				if (current[key] !== next[key]) {
					substate[key].setSilent(next[key]);
				}
			});
		}
	}

}
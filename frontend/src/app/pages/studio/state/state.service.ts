import { computed, Injectable, signal } from "@angular/core";
import { Author, ProjectMetadata, ProjectState, ProjectStudio } from "@shared/types";
import { Command, HistoryService } from "../services/history.service";

import { AppAuthService } from "@src/app/services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, filter, take } from "rxjs";
import axios from "axios";
import { AudioCacheService } from "../services/audio-cache.service";
import { DeepPartial, ObjectStateNode, objectStateNode, propStateNode, StateNode } from "./state.factory";
import { ObjectScaffold, Scaffold, STATE_SCAFFOLD } from "./state.scaffolds";
import { UserService } from "@src/app/services/user.service";
import { environment } from "@src/environments/environment.dev";
import { ApiService } from "@src/app/services/api.service";


@Injectable()
export class StateService { // SINGLETON
	private static _instance: StateService;
	static get instance(): StateService { return StateService._instance; }

	declare state : ObjectStateNode<ProjectState>;
	public isStateReady = signal<boolean>(false);

	declare projectId : string | null;
	declare isNew : boolean;

	constructor(
		private auth: AppAuthService,
		private userService: UserService,
		private route: ActivatedRoute,
		private router: Router,

		private historyService: HistoryService,
		private audioCacheService: AudioCacheService,
	) {		
		StateService._instance = this;
				
		combineLatest([
			this.route.paramMap,
			this.route.queryParams,
		]).pipe(
			filter(([params, queryParams]) => {
				const projectId = params.get('projectId');
				const isNew = queryParams['isNew'];
				const author = this.userService.author();
				return !!(projectId);
			}),
			take(1)
		).subscribe(([params, queryParams]) => {
			this.projectId = params.get('projectId');
			this.isNew = queryParams['isNew']==='true';
			const author = this.userService.author();
			
			this.initState(author!, this.projectId!, this.isNew!)
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
	// Methods

	async initState(author: Author, projectId: string, isNew: boolean) {
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
				}
				return res.data.success;
			} else {
				const res = await ApiService.instance.routes.saveStudioOverwrite({ 
					data: { 
						projectId: this.projectId, 
						state: this.state.snapshot() as ProjectState 
					}
				}, this.projectId!);
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

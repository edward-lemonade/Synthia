import { Injectable, signal } from "@angular/core";
import { Author, ProjectMetadata, ProjectState, ProjectStudio } from "@shared/types";
import { Command, HistoryService } from "../services/history.service";

import { AppAuthService } from "@src/app/services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, filter, take } from "rxjs";
import axios from "axios";
import { AudioCacheService } from "../services/audio-cache.service";
import { DeepPartial, ObjectStateNode, objectStateNode, propStateNode, StateNode } from "./state.factory";
import { ObjectScaffold, Scaffold, STATE_SCAFFOLD } from "./state.scaffolds";


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
		private route: ActivatedRoute,
		private router: Router,

		private historyService: HistoryService,
		private audioCacheService: AudioCacheService,
	) {		
		StateService._instance = this;
				
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
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');

			const res = await axios.post<{state: ProjectState}>(
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

			return res.data.state;

		} catch (err) {
			throw err;
		}
	}

	async saveState() { 
		const pendingCommands = this.historyService.getPendingCommandsAndClear();

		try {
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');
			
			if (this.isNew && token) {
				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_new', 
					{state: this.state.snapshot() as ProjectState},
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
				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_overwrite', 
					{state: this.state.snapshot() as ProjectState},
					{
						headers: {
							Authorization: `Bearer ${token}`
						}
					}
				);
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

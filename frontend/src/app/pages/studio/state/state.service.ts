import { Injectable, signal } from "@angular/core";
import { Author, ProjectMetadata, ProjectState, ProjectStudio } from "@shared/types";
import { HistoryService, PatchEntry } from "../services/history.service";

import { createState, isPrimitive, Stateify } from "./state.factory";
import { DEFAULT_METADATA, DEFAULT_STUDIO } from "./state.defaults";
import { AppAuthService } from "@src/app/services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, filter, take } from "rxjs";
import axios from "axios";
import { applyPatches } from "immer";


@Injectable()
export class StateService {
	public state = {
		metadata: createState<ProjectMetadata>(DEFAULT_METADATA, this) as Stateify<ProjectMetadata>,
		studio: createState<ProjectStudio>(DEFAULT_STUDIO, this) as Stateify<ProjectStudio>,
	}

	declare projectId : string | null;
	declare isNew : boolean;

	public isStateReady = signal<boolean>(false);

	constructor(
		public historyService: HistoryService,
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

	snapshot<T>(state: Stateify<T> = this.state as any): T {
		if (typeof state === 'function') {
			if (isPrimitive((state as any)())) {
				return (state as any)();
			} else {
				return this.snapshot((state as any)());
			}
		} else if (Array.isArray(state)) {
        	return state.map(item => this.snapshot(item)) as any;
    	} else if (state !== null && typeof state === 'object') {
			const obj: any = {};
			for (const key in state) {
				obj[key] = this.snapshot((state as any)[key]);
			}
			return obj;
		} 
		return state as any;
	}

	async initState(author: Author, projectId: string, isNew: boolean) {
		if (isNew) {
			const initialMetadata = DEFAULT_METADATA;
			initialMetadata.projectId = projectId;
			initialMetadata.authors = [author];

			const initialStudio = DEFAULT_STUDIO;

			this.applyState({metadata: initialMetadata, studio: initialStudio} as ProjectState)
		} else {
			const initialState = await this.loadState(projectId);

			this.applyState(initialState);
		}

		this.isStateReady.set(true);
	}

	async loadState(projectId: string, applyImmediately: boolean = false) {
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
			
			if (applyImmediately) {
				this.applyState(res.data.state);
			}
			return res.data.state;

		} catch (err) {
			throw err;
		}
	}

	async saveState() { 
		const patchEntries: PatchEntry[] = this.historyService.getPendingEntriesAndClear();

		try {
			if (this.isNew) {
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_new', 
					{state: this.snapshot() as ProjectState},
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
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_overwrite', 
					{state: this.snapshot() as ProjectState},
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

	applyState(state: ProjectState) {
		this.state = {
			metadata: createState<ProjectMetadata>(state.metadata as ProjectMetadata, this) as Stateify<ProjectMetadata>,
			studio: createState<ProjectStudio>(state.studio as ProjectStudio, this) as Stateify<ProjectStudio>,
		}
	}

	applyPatchEntry(patchEntry: PatchEntry, invert: boolean = false) {
		const patches = invert ? patchEntry.inversePatches : patchEntry.patches;
		if (!patches || patches.length === 0) return;

		const current = this.snapshot() as ProjectState;
  		const newState = applyPatches(current, patches);

		this.applyState(newState);
	}
}

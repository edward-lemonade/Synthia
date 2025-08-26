import { Injectable, signal } from "@angular/core";
import { Author, ProjectMetadata, ProjectState, ProjectStudio } from "@shared/types";
import { HistoryService, PatchEntry } from "../services/history.service";

import { stateNode, isPrimitive, StateNode, WritableStateSignal } from "./state.factory";
import { METADATA_DEFAULTS, STUDIO_DEFAULTS } from "./state.defaults";
import { AppAuthService } from "@src/app/services/app-auth.service";
import { ActivatedRoute, Router } from "@angular/router";
import { combineLatest, filter, take } from "rxjs";
import axios from "axios";
import { applyPatches } from "immer";
import { ViewportService } from "../services/viewport.service";


@Injectable()
export class StateService { // SINGLETON
	private static _instance: StateService;
	static get instance(): StateService { return StateService._instance; }

	declare state : StateNode<ProjectState>;

	declare projectId : string | null;
	declare isNew : boolean;

	public isStateReady = signal<boolean>(false);

	constructor(
		private auth: AppAuthService,
		private route: ActivatedRoute,
		private router: Router,
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

	get historyService() { return HistoryService.instance; }

	// ==============================================================================================
	// Methods

	async initState(author: Author, projectId: string, isNew: boolean) {
		if (isNew) {
			const initialMetadata = METADATA_DEFAULTS;
			initialMetadata.projectId = projectId;
			initialMetadata.authors = [author];

			const initialStudio = STUDIO_DEFAULTS;

			this.createState({metadata: initialMetadata, studio: initialStudio} as ProjectState)
		} else {
			const initialState = await this.loadState(projectId);

			this.createState(initialState);
		}
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
				this.createState(res.data.state);
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
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

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
			this.historyService.fillPendingEntries(patchEntries);
			throw err;
		}
	}

	createState(state: ProjectState) {
		this.state = stateNode<ProjectState>({
			metadata: {...METADATA_DEFAULTS, ...state.metadata},
			studio: {...STUDIO_DEFAULTS, ...state.studio},
		}, this) as StateNode<ProjectState>;
		this.isStateReady.set(true);
	}

	applyPatchEntry(patchEntry: PatchEntry, invert: boolean = false) {
		const patches = invert ? patchEntry.inversePatches : patchEntry.patches;
		if (!patches || patches.length === 0) return;

		patches.forEach(patch => {
           	const { op, path, value } = patch;
        
			switch (op) {
				case 'replace':
					this.applyReplace(path, value);
					break;
				case 'add':
					this.applyAdd(path, value);
					break;
				case 'remove':
					this.applyRemove(path);
					break;
			}
        });
	}
	private walkToSignal(path: (string | number)[], stepsFromEnd: number = 0) {
		let current: any = this.state;
		const targetDepth = path.length - 1 - stepsFromEnd;
		
		// Navigate to the target depth
		for (let i = 0; i <= targetDepth; i++) {
			const key = path[i];
			
			if (i === targetDepth) {
				// We're at the target depth, return current context and key
				return {
					parent: current,
					key: key,
					target: current[key]
				};
			}
			
			// Navigate deeper
			if (typeof current === 'function') {
				current = current(); // Call signal to get value
			}
			current = current[key];
		}
		
		// Fallback (shouldn't reach here with proper usage)
		return {
			parent: null,
			key: path[path.length - 1],
			target: current
		};
	}
	private applyReplace(path: (string | number)[], value: any) {
		const { target } = this.walkToSignal(path, 0);
		
		if (typeof target === 'function' && target.setSilent) {
			target.setSilent(value);
		}
	}
	private applyAdd(path: (string | number)[], value: any) {
		const { parent, key } = this.walkToSignal(path, 1);
		
		if (parent && typeof parent === 'function' && parent.updateSilent) {
			parent.updateSilent((arr: any[]) => {
				const newArr = [...arr];
				newArr.splice(Number(key), 0, value);
				return newArr;
			});
		}
	}
	private applyRemove(path: (string | number)[]) {
		const { parent, key } = this.walkToSignal(path, 1);
		
		if (parent && typeof parent === 'function' && parent.updateSilent) {

			parent.updateSilent((arr: any[]) => {
				const newArr = [...arr];
				newArr.splice(Number(key), 1);
				return newArr;
			});
		}
	}
}

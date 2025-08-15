import { Injectable, Signal, WritableSignal, signal, computed, effect, runInInjectionContext, Injector } from '@angular/core';
import { stateSignal, WritableStateSignal } from '../utils/state-signal';

import { ProjectStudio } from '@shared_types/ProjectStudio'

import { HistoryService, PatchEntry } from './history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';

import axios from 'axios';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, filter, take } from 'rxjs';

import { Author, ProjectMetadata } from '@shared/types';
import { DefaultKey, DefaultTimeSignature, Globals, Track, Tracks } from '@shared/types/studio';
import { applyPatches, produceWithPatches } from 'immer';

const DEFAULT_STATE = {
	metadata: {
		projectId: '',
		title: 'Untitled',
		authors: [] as Author[],
		createdAt: new Date(),
		updatedAt: new Date(),
		isCollaboration: false,
		isRemix: false,
		isRemixOf: null,
		isReleased: false,
	} as ProjectMetadata,
	globals: {
		bpm: 120,
		key: DefaultKey,
		centOffset: 0,
		timeSignature: DefaultTimeSignature,
		masterVolume: 100,
	} as Globals,
	tracks: {
		arr: [] as Track[],
	} as Tracks
} as ProjectStudio

type SignalState<T> = { [K in keyof T]: WritableStateSignal<T[K]> }

export class SignalStateClass<T extends Record<string, any>> {
	private _signalKeys: Set<string> = new Set();
	
	constructor(
		private injector: Injector,
		public historyService: HistoryService, // explicitly injected
		initialData: T,
		public substateName: string,
		public allowUndoRedo = true,
	) {
		for (const key in initialData) {
			(this as any)[key] = stateSignal(initialData[key], this, key);
			this._signalKeys.add(key);
		}
	}

	snapshot(): T {
		const result = {} as T;
		for (const key of this._signalKeys) {
			const signalValue = (this as any)[key];
			if (signalValue && typeof signalValue === 'function') {
				result[key as keyof T] = signalValue();
			}
		}
		return result;
	};
}

export interface ProjectState_Metadata extends SignalState<ProjectMetadata> {}
export class ProjectState_Metadata extends SignalStateClass<ProjectMetadata> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: ProjectMetadata, 
	) {
		super(
			injector,
			historyService,
			initialData,
			'metadata',
			false,
		);
	}
}
export interface ProjectState_Globals extends SignalState<Globals> {}
export class ProjectState_Globals extends SignalStateClass<Globals> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: Globals,
	) {
		super(
			injector,
			historyService,
			initialData,
			'globals',
			true,
		);
	}
}
export interface ProjectState_Tracks extends SignalState<Tracks> {}
export class ProjectState_Tracks extends SignalStateClass<Tracks> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: Tracks,
	) {
		super(
			injector,
			historyService,
			initialData,
			'tracks',
			true,
		);
	}

	readonly numTracks = computed(() => this.arr().length);

	addTrack(type: string) {
		const newTrack : Track = {
			index : this.numTracks(),
			name : "Track",
			type : type as typeof newTrack.type,
			files : null,
			color : "white",
			
			midiInstrument : "none",
		
			volume : 100,
			pan : 0,
			mute : false,
			solo : false,

			effects : [],

			midiData : [],
			clipData : [],
		}
		const curr = this.arr();
		this.arr.set([...curr, newTrack])
	}
	deleteTrack(index: number) {
		const curr = this.arr();
		const updated = curr.filter((track, i) => i !== index);
		this.arr.set(updated);
	}
	moveTrack(index: number, newIndex: number) {
		const curr = this.arr();
		if (index < 0 || index >= curr.length || newIndex < 0 || newIndex >= curr.length) return;

		const updated = [...curr];
		const [track] = updated.splice(index, 1); // Remove the track at `index`
		updated.splice(newIndex, 0, track);       // Insert it at `newIndex`
		updated.forEach((t, i) => t.index = i);

		this.arr.set(updated);
	}

	modifyTrack(index: number, prop: keyof Track, value: any) {
		const curr = this.arr();
		if (index < 0 || index >= curr.length) return;

		const updated = [...curr];
		updated[index] = {
			...updated[index],
			[prop]: value
		};
			
		this.arr.set(updated);
	}
}


@Injectable()
export class ProjectState {
	declare metadataState : ProjectState_Metadata;
	declare globalsState : ProjectState_Globals;
	declare tracksState : ProjectState_Tracks;

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

			this.metadataState = new ProjectState_Metadata(this.injector, this.historyService, initialState.metadata);
			this.globalsState = new ProjectState_Globals(this.injector, this.historyService, initialState.globals);
			this.tracksState = new ProjectState_Tracks(this.injector, this.historyService, initialState.tracks);
		} else {
			const initialState = await this.loadState(projectId);
	
			this.metadataState = new ProjectState_Metadata(this.injector, this.historyService, initialState.metadata);
			this.globalsState = new ProjectState_Globals(this.injector, this.historyService, initialState.globals);
			this.tracksState = new ProjectState_Tracks(this.injector, this.historyService, initialState.tracks);
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
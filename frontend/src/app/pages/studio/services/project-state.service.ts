import { Injectable, signal, computed, Injector } from '@angular/core';
import { BaseFile, DefaultKey, DefaultTimeSignature, ProjectMetadata, ProjectStudio, Track } from '@shared/types'

import { HistoryService, PatchEntry } from './history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';

import axios from 'axios';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, filter, take } from 'rxjs';

import { Author } from '@shared/types';
import { applyPatches } from 'immer';

import { DEFAULT_METADATA_STATE, DEFAULT_STUDIO_STATE, MetadataState, SignalStateClass, StudioState } from './substates';


@Injectable()
export class ProjectState {
	declare metadataState : MetadataState;
	declare studioState : StudioState;

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
	
	async initState(author: Author, projectId: string, isNew: boolean) {
		if (isNew) {
			const initialMetadata = DEFAULT_METADATA_STATE;
			const initialStudio = DEFAULT_STUDIO_STATE;
			initialMetadata.projectId = projectId,
			initialMetadata.authors = [author],

			this.metadataState = new MetadataState(this.injector, this.historyService, initialMetadata);
			this.studioState = new StudioState(this.injector, this.historyService, initialStudio);
		} else {
			const initialState = await this.loadState(projectId);
	
			this.metadataState = new MetadataState(this.injector, this.historyService, initialState.metadata);
			this.studioState = new StudioState(this.injector, this.historyService, initialState.studio);
		}

		this.isStateReady.set(true);
	}
	
	/*
	async saveStateOld() { 
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
	*/

	async saveState() { 
		const patchEntries: PatchEntry[] = this.historyService.getPendingEntriesAndClear();
			
		try {
			if (this.isNew) {
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_new', 
					{ 
						metadata: this.metadataState.snapshot(), 
						studio: this.studioState.snapshot(),
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
				const token = await this.auth.getAccessToken();
				console.log('Got JWT token:', token ? 'Token received' : 'No token');

				const res = await axios.post<{ success: boolean }>(
					'/api/projects/save_overwrite', 
					{ 
						metadata: this.metadataState.snapshot(), 
						studio: this.studioState.snapshot(),
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

			const res = await axios.post<{ metadata: ProjectMetadata, studio: ProjectStudio }>(
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
				this.applyState(res.data.metadata, res.data.studio);
			}
			return res.data;

		} catch (err) {
			throw err;
		}
	}

	applyState(metadata?: ProjectMetadata, studio?: ProjectStudio) {
		if (metadata) this.metadataState.loadState(metadata);
		if (studio) this.studioState.loadState(studio);
	}

	applyPatchEntry(patch: PatchEntry, invert: boolean = false) {
		const patches = invert ? patch.inversePatches : patch.patches;
		if (!patches || patches.length === 0) return;

		patches.forEach(patch => {
			this.studioState.loadPatch(patch);
		});
	}

}
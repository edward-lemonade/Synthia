import { Injectable, Signal, inject, signal, computed } from '@angular/core';

import { ProjectStudio } from '@shared_types/ProjectStudio'

import { ProjectMetadataService } from '../state/subservices/project-metadata.service';
import { ProjectGlobalsService } from '../state/subservices/project-globals.service';
import { ProjectTracksService } from '../state/subservices/project-tracks.service';
import { HistoryService, PatchEntry } from '../services/history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';

import axios from 'axios';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, filter, take } from 'rxjs';

import { Author, ProjectMetadata } from '@shared/types';
import { DefaultKey, DefaultTimeSignature, Globals, Track, Tracks } from '@shared/types/studio';

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

@Injectable()
export class ProjectState {
	private metadataService = inject(ProjectMetadataService);
	private globalsService = inject(ProjectGlobalsService);
	private tracksService = inject(ProjectTracksService);
	private historyService = inject(HistoryService);

	declare projectId : string | null;
	declare isNew : boolean;

	readonly state = computed<ProjectStudio | null>(() => {
		return {
			metadata: this.metadataService.state(),
			globals: this.globalsService.state(),
			tracks: this.tracksService.state()
		};
	});

	constructor(
		private auth: AppAuthService,
		private route: ActivatedRoute,
		private router: Router,
	) {
		console.log("constructor")

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
			
			this.init(author!, this.projectId!, this.isNew!)
		});
	}
	
	async init(author: Author, projectId: string, isNew: boolean) {
		if (isNew) {
			const state = DEFAULT_STATE;
			state.metadata.projectId = projectId,
			state.metadata.authors = [author],

			this.metadataService.init(state.metadata);
			this.globalsService.init(state.globals);
			this.tracksService.init(state.tracks);
		} else {
			const state = await this.load(projectId);
	
			this.metadataService.init(state.metadata);
			this.globalsService.init(state.globals);
			this.tracksService.init(state.tracks);
		}
	}
	
	async save() { 
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
						path: [entry.service, ...patch.path],
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

	async load(projectId: string) {
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

			return res.data.state;

		} catch (err) {
			throw err;
		}
	}
}
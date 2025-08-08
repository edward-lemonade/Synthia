import { Injectable, inject, signal, computed } from '@angular/core';

import { ProjectStudio } from '@shared_types/ProjectStudio'

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectGlobalsService } from '../services/project-globals.service';
import { ProjectTracksService } from '../services/project-tracks.service';
import { HistoryService, PatchEntry } from '../services/history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';

import axios from 'axios';
import { ActivatedRoute } from '@angular/router';

@Injectable()
export class ProjectState {
	private metadataService = inject(ProjectMetadataService);
	private globalsService = inject(ProjectGlobalsService);
	private tracksService = inject(ProjectTracksService);
	private historyService = inject(HistoryService);

	declare projectId : string;
	declare isNew : boolean;

	constructor(
		private auth: AppAuthService,
		private route: ActivatedRoute,
	) {
		this.route.queryParams.subscribe(params => {
			this.isNew = params["isNew"];
			this.projectId = params["projectId"];
		})
	}
	
	readonly state = computed<ProjectStudio | null>(() => {
		return {
			metadata: this.metadataService.state(),
			globals: this.globalsService.state(),
			tracks: this.tracksService.state()
		};
	});
	
	async save() { 
		if (this.isNew) { // new project
			try {
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
				return res.data.success;
			} catch (err) {
				throw err;
			}
		} else { // save existing project
			const patchEntries: PatchEntry[] = this.historyService.getPendingEntriesAndClear();
			if (patchEntries.length === 0) { return { ok: true, saved: 0 }; }

			const patches = patchEntries.flatMap(entry => {
				if (!entry.patches) return [];
				return entry.patches.map(patch => ({
					...patch,
					path: [entry.service, ...patch.path],
				}));
			});

			try {
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
			} catch (err) {
				this.historyService.fillPendingEntries(patchEntries)
				throw err;
			}
		}
	}

}
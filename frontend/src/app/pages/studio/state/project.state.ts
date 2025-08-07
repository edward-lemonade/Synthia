import { Injectable, inject, signal, computed } from '@angular/core';

import { ProjectStudio } from '@shared_types/ProjectStudio'

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectGlobalsService } from '../services/project-globals.service';
import { ProjectTracksService } from '../services/project-tracks.service';
import { HistoryService, PatchEntry } from '../services/history.service';

import axios from 'axios';

@Injectable()
export class ProjectState {
	private metadataService = inject(ProjectMetadataService);
	private globalsService = inject(ProjectGlobalsService);
	private tracksService = inject(ProjectTracksService);
	private historyService = inject(HistoryService);

	constructor() {}
	
	readonly state = computed<ProjectStudio | null>(() => {
		return {
			metadata: this.metadataService.state(),
			globals: this.globalsService.state(),
			tracks: this.tracksService.state()
		};
	});
	
	async save() { // MAKE API CALL TO SAVE PROJECT TO DATABASE
		const entries = this.historyService.getPendingEntriesAndClear();
		if (entries.length === 0) { return { ok: true, saved: 0 }; }

		try {
			const res = await axios.post('/api/studio/save', { entries });
			return res.data;
		} catch (err) {
			this.historyService.fillPendingEntries(entries)
			throw err;
		}
	}

}
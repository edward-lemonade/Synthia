import { Injectable, signal, computed } from '@angular/core';

import { ProjectStudio } from '@shared_types/ProjectStudio'
import { DefaultKey } from '@shared/types/Key';
import { DefaultTimeSignature } from '@shared/types/TimeSignature';

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectVarsService } from '../services/project-vars.service';
import { ProjectTracksService } from '../services/project-tracks.service';

import axios from 'axios';


@Injectable()
export class ProjectState {
	constructor(
		private metadata: ProjectMetadataService,
		private vars: ProjectVarsService,
		private tracks: ProjectTracksService,
	) {}

	readonly state = computed<ProjectStudio | null>(() => {
		return {
			metadata: this.metadata.state(),
			vars: this.vars.state(),
			tracks: this.tracks.state()
		};
	});

	async save() { // MAKE API CALL TO SAVE PROJECT TO DATABASE
		const res = await axios.post<{}>(
			'/api/studio/save', {},
			{

			}
		)
	}

}
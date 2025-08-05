import { Injectable, signal, computed } from '@angular/core';

import { ProjectStudio } from '@shared_types/ProjectStudio'
import { DefaultKey } from '@shared/types/Key';
import { DefaultTimeSignature } from '@shared/types/TimeSignature';

import { ProjectMetadataService } from '../services/project-metadata.service';
import { ProjectVarsService } from '../services/project-vars.service';
import { ProjectTracksService } from '../services/project-tracks.service';

export function createDefaultProjectStudio() : ProjectStudio {
	return {
		metadata: {
			_id: "placeholder",
			title: "Untitled",
			authorIds: [],
			authors: [],
			createdAt: new Date(),
			updatedAt: new Date(),

			isCollaboration: false,
			isRemix: false,
			isRemixOf: null,

			isReleased: false,
		},
		vars: {
			bpm: 120,
			key: DefaultKey,
			centOffset: 0,
			timeSignature:DefaultTimeSignature,
			masterVolume: 100
		},
		tracks: {
			tracks: []
		}
	}
}

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

	init(project?: ProjectStudio) {
		const p = project ?? createDefaultProjectStudio();
		this.metadata.init(p.metadata);
		this.vars.init(p.vars);
		this.tracks.init(p.tracks);
	}

}
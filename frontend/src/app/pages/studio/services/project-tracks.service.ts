import { WritableSignal } from '@angular/core';
import type { ProjectTracks, Track } from '@shared/types/ProjectStudio';
import { SignalStateService } from './signal-state.service';

const DEFAULTS = {
	tracks: []
};


export class ProjectTracksService extends SignalStateService<ProjectTracks> {
	declare tracks: Track[];

	constructor() {
		super(DEFAULTS);
		console.log(this);
	}
}
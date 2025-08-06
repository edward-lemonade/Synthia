import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { ProjectTracks, Track } from '@shared/types/ProjectStudio';
import { SignalStateService } from './signal-state.service';

import { ProjectState } from '../state/project.state';
import { HistoryService } from './history.service';

const DEFAULTS = {
	tracks: []
};

@Injectable()
export class ProjectTracksService extends SignalStateService<ProjectTracks> {
	declare tracks: Track[];

	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerTracksService(this);

		this.initProps(true, "tracks"); // must be seperate from super() or else props are undefined (no explanation) 
	}
}
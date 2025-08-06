import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Track } from '@shared/types/studio';
import { SignalStateService } from './signal-state.service';

import { HistoryService } from './history.service';

const DEFAULTS = {
	tracks: [] as Track[],
};

@Injectable()
export class ProjectTracksService extends SignalStateService<{tracks: Track[]}> {
	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerTracksService(this);

		this.initProps(true, "tracks"); // must be seperate from super() or else props are undefined (no explanation) 
	}
}
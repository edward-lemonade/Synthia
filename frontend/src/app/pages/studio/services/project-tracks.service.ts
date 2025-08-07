import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Tracks, Track } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';

const DEFAULTS = {
	arr: [] as Track[],
};

@Injectable()
export class ProjectTracksService extends BaseStateService<Tracks> {
	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerTracksService(this);
	}
}
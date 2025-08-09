import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Tracks, Track } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';
import { ActivatedRoute } from '@angular/router';


@Injectable()
export class ProjectTracksService extends BaseStateService<Tracks> {
	constructor(
		historyService: HistoryService, 
	) {
		super(historyService, "tracks");
		historyService.registerTracksService(this);
	}	
	
	override init(state: Tracks) {
		super.init(state);
	}
}
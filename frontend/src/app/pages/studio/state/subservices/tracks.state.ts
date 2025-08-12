import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Tracks, Track } from '@shared/types/studio';
import { BaseState } from './base.state';

import { HistoryService } from '../../services/history.service';
import { ActivatedRoute } from '@angular/router';


@Injectable()
export class TracksState extends BaseState<Tracks> {
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
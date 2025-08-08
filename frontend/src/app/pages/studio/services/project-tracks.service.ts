import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Tracks, Track } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';
import { ActivatedRoute } from '@angular/router';

const DEFAULTS = {
	arr: [] as Track[],
};

@Injectable()
export class ProjectTracksService extends BaseStateService<Tracks> {
	constructor(
		historyService: HistoryService, 
		private route: ActivatedRoute,
	) {
		super(historyService, "tracks");
		historyService.registerTracksService(this);

		this.route.queryParams.subscribe(params => {
			if (params['isNew']) {
				this.init(DEFAULTS);
			} else {
				// load from backend
			}
		})
	}	
	
}
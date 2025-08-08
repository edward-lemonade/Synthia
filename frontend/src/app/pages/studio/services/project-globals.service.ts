import { Injectable, OnInit, WritableSignal, signal } from '@angular/core';
import type { Globals } from '@shared/types/studio';
import { DefaultKey, Key, DefaultTimeSignature, TimeSignature } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';
import { ActivatedRoute } from '@angular/router';

const DEFAULTS = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,
};

@Injectable()
export class ProjectGlobalsService extends BaseStateService<Globals> {
	constructor(
		historyService: HistoryService,
		private route: ActivatedRoute,
	) {
		super(historyService, "globals");
		historyService.registerGlobalsService(this);

		this.route.queryParams.subscribe(params => {
			if (params['isNew']) {
				this.init(DEFAULTS);
			} else {
				// load from backend
			}
		})
	}
}
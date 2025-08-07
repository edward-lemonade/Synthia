import { Injectable, WritableSignal, signal } from '@angular/core';
import type { Globals } from '@shared/types/studio';
import { DefaultKey, Key, DefaultTimeSignature, TimeSignature } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';

const DEFAULTS = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,
};

@Injectable()
export class ProjectGlobalsService extends BaseStateService<Globals> {
	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerGlobalsService(this);
	}
}
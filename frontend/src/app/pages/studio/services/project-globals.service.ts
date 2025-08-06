import { Injectable, WritableSignal } from '@angular/core';
import type { Globals } from '@shared/types/studio';
import { DefaultKey, Key, DefaultTimeSignature, TimeSignature } from '@shared/types/studio';
import { SignalStateService } from './signal-state.service';

import { HistoryService } from './history.service';

const DEFAULTS = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,
};

@Injectable()
export class ProjectGlobalsService extends SignalStateService<Globals> {
	declare bpm: WritableSignal<number>;
	declare key: WritableSignal<Key>;
	declare centOffset: WritableSignal<number>;
	declare timeSignature: WritableSignal<TimeSignature>;
	declare masterVolume: WritableSignal<number>;

	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerGlobalsService(this);

		this.initProps(true, "globals"); // must be seperate from super() or else props are undefined (no explanation) 
	}
}
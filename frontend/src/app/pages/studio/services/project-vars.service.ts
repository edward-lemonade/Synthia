import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { ProjectVars } from '@shared/types/ProjectStudio';
import { DefaultKey, Key } from '@shared/types/Key';
import { DefaultTimeSignature, TimeSignature } from '@shared/types/TimeSignature';
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
export class ProjectVarsService extends SignalStateService<ProjectVars> {
	declare bpm: WritableSignal<number>;
	declare key: WritableSignal<Key>;
	declare centOffset: WritableSignal<number>;
	declare timeSignature: WritableSignal<TimeSignature>;
	declare masterVolume: WritableSignal<number>;

	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);
		historyService.registerVarsService(this);

		this.initProps(true, "vars"); // must be seperate from super() or else props are undefined (no explanation) 
	}
}
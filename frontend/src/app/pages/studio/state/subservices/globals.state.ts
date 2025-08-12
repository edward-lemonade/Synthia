import { Injectable } from '@angular/core';
import type { Globals } from '@shared/types/studio';
import { BaseState } from './base.state';

import { HistoryService } from '../../services/history.service';


@Injectable()
export class GlobalsState extends BaseState<Globals> {
	constructor(
		historyService: HistoryService,
	) {
		super(historyService, "globals");
		historyService.registerGlobalsService(this);
	}

	override init(state: Globals) {
		super.init(state)
	}
}
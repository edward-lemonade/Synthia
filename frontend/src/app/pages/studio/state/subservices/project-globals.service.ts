import { Injectable } from '@angular/core';
import type { Globals } from '@shared/types/studio';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './../../services/history.service';


@Injectable()
export class ProjectGlobalsService extends BaseStateService<Globals> {
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
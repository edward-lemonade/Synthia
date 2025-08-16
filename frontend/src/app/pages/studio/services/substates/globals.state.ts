import { Globals } from "@shared/types/studio";

import { SignalState, SignalStateClass } from "./_base.state";
import { Injector } from "@angular/core";
import { HistoryService } from "../history.service";

export interface ProjectState_Globals extends SignalState<Globals> {}
export class ProjectState_Globals extends SignalStateClass<Globals> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: Globals,
	) {
		super(
			injector,
			historyService,
			initialData,
			'globals',
			true,
		);
	}
}
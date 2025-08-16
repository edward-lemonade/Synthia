import { ProjectStudioGlobals } from "@shared/types";

import { SignalState, SignalStateClass } from "./_base.state";
import { Injector } from "@angular/core";
import { HistoryService } from "../history.service";

export interface ProjectStateGlobals extends SignalState<ProjectStudioGlobals> {}
export class ProjectStateGlobals extends SignalStateClass<ProjectStudioGlobals> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: ProjectStudioGlobals,
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
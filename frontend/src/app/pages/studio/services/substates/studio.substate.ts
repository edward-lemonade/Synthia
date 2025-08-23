import { ProjectStudio } from "@shared/types";

import { SignalState, SignalStateClass } from "./_base.state";
import { Injector } from "@angular/core";
import { HistoryService } from "../history.service";

export interface StudioState extends SignalState<ProjectStudio> {}
export class StudioState extends SignalStateClass<ProjectStudio> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: ProjectStudio,
	) {
		super(
			injector,
			historyService,
			initialData,
			true,
		);
	}
}
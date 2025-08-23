import { ProjectMetadata } from "@shared/types";

import { SignalState, SignalStateClass } from "./_base.state";
import { Injector } from "@angular/core";
import { HistoryService } from "../history.service";

export interface MetadataState extends SignalState<ProjectMetadata> {}
export class MetadataState extends SignalStateClass<ProjectMetadata> {
	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: ProjectMetadata, 
	) {
		super(
			injector,
			historyService,
			initialData,
			false,
		);
	}
}
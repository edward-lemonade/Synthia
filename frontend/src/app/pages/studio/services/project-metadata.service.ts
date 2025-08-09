import { Injectable } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { BaseStateService } from './base-state.service';

import { HistoryService } from './history.service';


@Injectable()
export class ProjectMetadataService extends BaseStateService<ProjectMetadata> {
	constructor(
		historyService: HistoryService, 
	) {
		super(historyService, "metadata");
	}

	override init(state: ProjectMetadata) {
		super.init(state)
	}
}
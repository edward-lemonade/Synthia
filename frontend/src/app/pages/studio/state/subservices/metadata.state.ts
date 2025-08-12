import { Injectable } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { BaseState } from './base.state';

import { HistoryService } from '../../services/history.service';


@Injectable()
export class MetadataState extends BaseState<ProjectMetadata> {
	constructor(
		historyService: HistoryService, 
	) {
		super(historyService, "metadata");
	}

	override init(state: ProjectMetadata) {
		super.init(state)
	}
}
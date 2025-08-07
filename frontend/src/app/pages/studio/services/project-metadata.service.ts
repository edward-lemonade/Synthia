import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { BaseStateService } from './base-state.service';
import { Author } from '@shared/types/Author';

import { HistoryService } from './history.service';

const DEFAULTS = {
	projectId: '',
	title: 'Untitled',
	authors: [],
	createdAt: new Date(),
	updatedAt: new Date(),
	isCollaboration: false,
	isRemix: false,
	isRemixOf: null,
	isReleased: false,
};

@Injectable()
export class ProjectMetadataService extends BaseStateService<ProjectMetadata> {
	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS, "metadata");
	}
}
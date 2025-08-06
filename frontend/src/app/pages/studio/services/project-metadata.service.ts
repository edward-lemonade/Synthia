import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { SignalStateService } from './signal-state.service';
import { Author } from '@shared/types/Author';

import { HistoryService } from './history.service';

const DEFAULTS = {
	_id: '',
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
export class ProjectMetadataService extends SignalStateService<ProjectMetadata> {
	declare _id: WritableSignal<string>;
	declare title: WritableSignal<string>;
	declare authors: WritableSignal<Author[]>;
	declare createdAt: WritableSignal<Date>;
	declare updatedAt: WritableSignal<Date>;
	declare isCollaboration: WritableSignal<boolean>;
	declare isRemix: WritableSignal<boolean>;
	declare isRemixOf: WritableSignal<string>;
	declare isReleased: WritableSignal<boolean>;

	constructor(historyService: HistoryService) {
		super(historyService, DEFAULTS);

		this.initProps(false); // must be seperate from super() or else props are undefined (no explanation) 
	}
}
import { WritableSignal } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { SignalStateService } from './signal-state.service';
import { Author } from '@shared/types/Author';

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

	constructor() {
		super(DEFAULTS);
		console.log(this);
	}
}
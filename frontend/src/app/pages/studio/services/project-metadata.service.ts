import { Injectable, OnInit, WritableSignal } from '@angular/core';
import type { ProjectMetadata } from '@shared/types/ProjectMetadata';
import { BaseStateService } from './base-state.service';
import { Author } from '@shared/types/Author';
import { filter, take } from 'rxjs/operators';

import { HistoryService } from './history.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { ActivatedRoute } from '@angular/router';

const DEFAULTS = {
	projectId: '',
	title: 'Untitled',
	authors: [] as Author[],
	createdAt: new Date(),
	updatedAt: new Date(),
	isCollaboration: false,
	isRemix: false,
	isRemixOf: null,
	isReleased: false,
};

@Injectable()
export class ProjectMetadataService extends BaseStateService<ProjectMetadata> {
	constructor(
		historyService: HistoryService, 
		private route: ActivatedRoute,
		private auth: AppAuthService,
	) {
		super(historyService, "metadata");
		
		this.route.queryParams.subscribe(params => {
			if (params['isNew']) {
				this.auth.getAuthor$()
				.pipe(
					filter(author => author !== null), 
					take(1)                           
				).subscribe(author => {
					DEFAULTS.projectId = params['projectId'];
					DEFAULTS.authors = [author];
					this.init(DEFAULTS);
				});
			} else {
				// load from backend
			}
		})
	}
}
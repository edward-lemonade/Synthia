import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { ProjectState } from './state/project.state';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';
import { ProjectMetadataService } from './services/project-metadata.service';
import { ProjectGlobalsService } from './services/project-globals.service';
import { ProjectTracksService } from './services/project-tracks.service';
import { HistoryService } from './services/history.service';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent],
	providers: [ProjectState, ProjectMetadataService, ProjectGlobalsService, ProjectTracksService, HistoryService, AppAuthService],
	template: `
		<app-studio-toolbar-top></app-studio-toolbar-top>
		<app-studio-toolbar-details></app-studio-toolbar-details>
	`,
	styles: ``
})
export class StudioPage implements OnInit {
	sessionId: string = '';

	constructor(
		private route: ActivatedRoute,	
		private auth: AppAuthService,
		public projectState: ProjectState
	) {}

	ngOnInit() {
		this.route.params.subscribe(params => {
			this.sessionId = params['sessionId'];
			console.log('Studio component loaded with sessionId:', this.sessionId);
			
			this.initializeProjectWithUser();
		});
	}

	private initializeProjectWithUser() {
		const user = this.auth.getUser();
		if (user) {	
			
			//this.projectState.initializeProject(this.sessionId);
			//this.projectState.addAuthor(currentUser);

		} else {
			console.error("Not logged in or user not found!")
		}
	}

}

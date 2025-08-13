import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { ProjectState } from './state/project.state';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';
import { MetadataState } from './state/subservices/metadata.state';
import { GlobalsState } from './state/subservices/globals.state';
import { TracksState } from './state/subservices/tracks.state';
import { HistoryService } from './services/history.service';
import { StudioEditorComponent } from "./components/studio-editor/studio-editor.component";
import { ZoomScrollService } from './services/zoom-scroll.service';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent, StudioEditorComponent],
	providers: [ProjectState, MetadataState, GlobalsState, TracksState, HistoryService, AppAuthService, ZoomScrollService],
	template: `
		<div class="page-container">
			<app-studio-toolbar-top></app-studio-toolbar-top>
			<app-studio-toolbar-details></app-studio-toolbar-details>
			<app-studio-editor></app-studio-editor>
		</div>
	`,
	styles: `
		.page-container {
			display: flex;
			flex-direction: column;
			position: absolute;
			height: 100%;
			width: 100%;
		}
	`
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

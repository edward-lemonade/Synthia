import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { env } from '@env/environment';

import { ProjectState } from './state/project.state';
import { Author } from '@shared_types/Author';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';
import { ProjectMetadataService } from './services/project-metadata.service';
import { ProjectVarsService } from './services/project-vars.service';
import { ProjectTracksService } from './services/project-tracks.service';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent],
	providers: [ProjectState, ProjectMetadataService, ProjectVarsService, ProjectTracksService],
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
		private auth: AuthService,
		private http: HttpClient,
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
		this.auth.user$.subscribe({
			next: (user) => {
				if (user && user.sub) {
					console.log('User info:', user);
					
					const currentUser: Author = {
						userId: user.sub,
						username: user.name || user.email || 'Unknown User'
					};
					
					//this.projectState.initializeProject(this.sessionId);
					//this.projectState.addAuthor(currentUser);
				} else {
					console.error('No user found');
				}
			},
			error: (err) => {
				console.error('Error getting user info:', err);
			}
		});
	}

}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { env } from '@env/environment';

import { StudioService } from './studio.service';
import { User } from '@shared_types/User';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent],
	providers: [StudioService],
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
		public studioService: StudioService
	) {}

	ngOnInit() {
		this.route.params.subscribe(params => {
			this.sessionId = params['sessionId'];
			console.log('Studio component loaded with sessionId:', this.sessionId);
			
			// Get user info and initialize project
			this.initializeProjectWithUser();
		});
	}

	private initializeProjectWithUser() {
		this.auth.user$.subscribe({
			next: (user) => {
				if (user && user.sub) {
					console.log('User info:', user);
					
					const currentUser: User = {
						userId: user.sub,
						username: user.name || user.email || 'Unknown User'
					};
					
					this.studioService.initializeProject(this.sessionId);
					this.studioService.addAuthor(currentUser);
				} else {
					console.error('No user found');
				}
			},
			error: (err) => {
				console.error('Error getting user info:', err);
			}
		});
	}

	private loadExistingProjectData() {
		// Get access token for API calls
		this.auth.getAccessTokenSilently({ 
			authorizationParams: {
				audience: env.auth0_api_aud,
			}
		}).subscribe({
			next: (token) => {
				const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
				
				// Try to load existing project data
				this.http.get<any>(`/api/studio_session/${this.sessionId}`, { headers })
					.subscribe({
						next: (projectData) => {
							if (projectData) {
								console.log('Loading existing project data:', projectData);
								this.studioService.loadProject(projectData);
								
								// Ensure current user is still an author
								const currentUser = this.auth.user$;
								currentUser.subscribe(user => {
									if (user && user.sub) {
										const userObj: User = {
											userId: user.sub,
											username: user.name || user.email || 'Unknown User'
										};
										this.studioService.addAuthor(userObj);
									}
								});
							}
						},
						error: (err) => {
							console.log('No existing project data found');
						}
					});
			},
			error: (err) => {
				console.error('Failed to get access token:', err);
			}
		});
	}
}

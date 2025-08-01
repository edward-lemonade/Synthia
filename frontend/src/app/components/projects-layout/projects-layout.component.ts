import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { env } from '@env/environment';

@Component({
	selector: 'app-projects-layout',
	standalone: true,
	imports: [RouterModule, MatSidenavModule, MatListModule, MatButtonModule, MatIconModule, HttpClientModule],
	template: `
		<mat-sidenav-container class="sidenav-container">
			<mat-sidenav #sidenav mode="side" opened class="sidebar"
				[fixedInViewport]="true" 
				[fixedTopGap]="64" [fixedBottomGap]="0">
				<mat-nav-list >
					<button mat-button class="sidebar-btn" routerLink="/projects/all-projects" routerLinkActive="sidebar-btn-active">
						<mat-icon>folder</mat-icon>
						All Projects
					</button>
					<button mat-button class="sidebar-btn" routerLink="/projects/my-projects" routerLinkActive="sidebar-btn-active">
						<mat-icon>person</mat-icon>
						My Projects
					</button>
					<button mat-button class="sidebar-btn" routerLink="/projects/collabs" routerLinkActive="sidebar-btn-active">
						<mat-icon>group</mat-icon>
						Collabs
					</button>
					<button mat-button class="sidebar-btn" routerLink="/projects/remixes" routerLinkActive="sidebar-btn-active">
						<mat-icon>loop</mat-icon>
						Remixes
					</button>

					<button mat-button class="sidebar-btn2" (click)="newProjectOnClick()">
						<mat-icon>add</mat-icon>
						New Project
					</button>
				</mat-nav-list>
			</mat-sidenav>
			<mat-sidenav-content class="projects-content">
				<router-outlet></router-outlet>
			</mat-sidenav-content>
		</mat-sidenav-container>
	`,
	styleUrls: ['./projects-layout.component.scss']
})
export class ProjectsLayoutComponent {
	constructor(
		private http: HttpClient, 
		private router: Router, 
		private auth: AuthService
	) {}

	newProjectOnClick() {
		this.auth.getAccessTokenSilently({ 
			authorizationParams: {
				audience: env.auth0_api_aud,
				prompt: 'consent',
			}
		}).subscribe({
			next: (token) => {
				console.log('Got JWT token:', token ? 'Token received' : 'No token');
				
				const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
				
				this.http.post<{ sessionId: string }>(
					'/api/studio_session/create', {}, { headers }
				).subscribe({
					next: (res) => {
						if (res.sessionId) {
							console.log('Redirecting to studio with sessionId: ', res.sessionId);
							this.router.navigate(['/studio', res.sessionId]);
						}
					},
					error: (err) => {
						console.error('Failed to create studio session: ', err);
					}
				});
			},
			error: (err) => {
				console.error('Failed to get access token: ', err)
			}
		})	
	}
} 
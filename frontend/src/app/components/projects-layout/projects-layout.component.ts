import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { env } from '@env/environment';

import { COLORS, SPACES } from '../../theme';

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
	styles: [`
		.sidenav-container {
			height: calc(100vh - 64px);
			background: ${COLORS.APP_BG};
		}
		mat-sidenav { width: 400px; }
		.sidebar {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			padding-top: 10px; 
			padding-left: ${SPACES.PAD_ENDS};
			background: ${COLORS.SIDEBAR_BG};
			border-radius: 0;
		}
	   	.sidebar-btn {
			gap: 8px;
			justify-content: flex-start; 
			text-align: left;

			background: ${COLORS.ACCENT_ORANGE};
			color: ${COLORS.APP_BG};
			transition: background 0.2s;
	
			margin-top: 8px;
			width: 200px;
		}
		.sidebar-btn[routerLinkActive].sidebar-btn-active {
            background: #fff !important;
            font-weight: bold;
        }
		.sidebar-btn:hover {
            background: ${COLORS.ACCENT_ORANGE_L} !important;
        }

		.sidebar-btn2 {
			gap: 8px;
			justify-content: flex-start; 
			text-align: left;

			background: ${COLORS.ACCENT_PURPLE};
			color: ${COLORS.APP_BG};
			transition: background 0.2s;
	
			margin-top: 24px;
			width: 200px;
		}
		.sidebar-btn2:hover {
            background: ${COLORS.ACCENT_PURPLE_L} !important;
        }

		.projects-content {
			background: ${COLORS.APP_BG};
		}
	`]
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
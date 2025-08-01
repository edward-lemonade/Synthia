import { Component, Inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
	selector: 'app-appbar-layout',
	imports: [CommonModule, MatButtonModule, MatToolbarModule, MatTabsModule, RouterModule],
	template: `
		<ng-container *ngIf="auth.isAuthenticated$ | async">	
			<mat-toolbar class="appbar">
				<span>NoteFlyte</span>

				<mat-tab-nav-panel #panel>
					<nav mat-tab-nav-bar class="nav" [tabPanel]="panel">
						<a mat-tab-link 
							class="nav-btn" 
							routerLink="/projects" 
							routerLinkActive="nav-btn-active" #rlaProjects="routerLinkActive" 
							[routerLinkActiveOptions]="{ exact: false }" 
							[active]="rlaProjects.isActive">
							Projects
						</a>
						<a mat-tab-link 
							class="nav-btn" 
							routerLink="/discover" 
							routerLinkActive="nav-btn-active" #rlaDiscover="routerLinkActive" 
							[routerLinkActiveOptions]="{ exact: false }" 
							[active]="rlaDiscover.isActive">
							Discover
						</a>
						<a mat-tab-link 
							class="nav-btn" 
							routerLink="/showcase" 
							routerLinkActive="nav-btn-active" #rlaShowcase="routerLinkActive" 
							[routerLinkActiveOptions]="{ exact: false }" 
							[active]="rlaShowcase.isActive">
							Showcase
						</a>
					</nav>
				</mat-tab-nav-panel>

				<span class="spacer"></span>

				<button mat-button class="appbar-btn" (click)="auth.logout({ 
					logoutParams: { returnTo: document.location.origin } 
				})">
					Log out
				</button>
			</mat-toolbar>
		</ng-container>

		<ng-container *ngIf="!(auth.isAuthenticated$ | async)">	
			<mat-toolbar class="appbar">
				<span>NoteFlyte</span>

				<span class="spacer"></span>
				
				<button mat-button class="appbar-btn" (click)="auth.loginWithRedirect({
					appState: { target: '/projects/all-projects' }
				})">
					Login
				</button>
			</mat-toolbar>
		</ng-container>

		<router-outlet></router-outlet>
	`,
	styleUrls: ['./appbar-layout.component.scss']
})
export class AppbarLayoutComponent {
	constructor(
		@Inject(DOCUMENT) public document: Document, 
		public auth: AuthService
	) {}
}

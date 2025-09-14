import { AfterViewInit, Component, computed, inject, Inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { UserService } from '@src/app/services/user.service';
import { MatMenu, MatMenuModule } from "@angular/material/menu";
import { f } from "../../../../node_modules/@angular/material/icon-module.d-COXCrhrh";
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-appbar-layout',
	imports: [CommonModule, MatButtonModule, MatToolbarModule, MatTabsModule, RouterModule, MatMenuModule, MatIconModule, MatIconButton],
	template: `
		<div class="page-container">
			<ng-container *ngIf="auth.isAuthenticated$ | async">	
				<mat-toolbar class="appbar">
					<span>Synthia</span>

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

					<button mat-icon-button 
						class="icon-button profile-picture-button"
						[matMenuTriggerFor]="userSettings">
						<img 
							*ngIf="userPicture(); else fallbackIcon"
							[src]="userPicture()" 
							class="profile-picture">
						<ng-template #fallbackIcon>
							<mat-icon>account_circle</mat-icon>
						</ng-template>
					</button>
					<mat-menu #userSettings="matMenu" class="user-settings-menu">
						<div class="user-settings-menu-content">
							<button mat-menu-item class="user-settings-menu-btn" (click)="profile()">
								<mat-icon>account_box</mat-icon>
								Profile
							</button>
							<button mat-menu-item class="user-settings-menu-btn" (click)="settings()">
								<mat-icon>settings</mat-icon>
								Settings
							</button>
							<button mat-menu-item class="user-settings-menu-btn" (click)="logout()">
								<mat-icon>logout</mat-icon>
								Log out
							</button>
						</div>
					</mat-menu>

				</mat-toolbar>

				<div class="page-content">
					<router-outlet></router-outlet>
				</div>
			</ng-container>

			<ng-container *ngIf="!(auth.isAuthenticated$ | async)">	
				<mat-toolbar class="appbar">
					<span>Synthia</span>

					<span class="spacer"></span>
					
					<button mat-button class="appbar-btn" (click)="auth.loginWithRedirect({
						appState: { target: '/projects/all-projects' }
					})">
						Login
					</button>
				</mat-toolbar>

				<div class="page-content">
					<router-outlet></router-outlet>
				</div>
			</ng-container>
		</div>
	`,
	styleUrls: ['./appbar-layout.component.scss']
})
export class AppbarLayoutComponent implements AfterViewInit {
	constructor(
		@Inject(DOCUMENT) public document: Document, 
		public auth: AuthService,
		public router: Router,
	) {}

	private appAuthService = inject(AppAuthService);
	private userService = inject(UserService);
	
	ngAfterViewInit() {
		
		console.log(this.appAuthService.getUserAuth());
	}

	userPicture = computed(() => { return this.appAuthService.getUserAuth()?.picture });

	profile() {
		this.router.navigate(['/profile', this.userService.getUser()?.displayName]);
	}

	settings() {
		this.router.navigate(['/settings']);
	}

	logout() {
		this.auth.logout({ 
			logoutParams: { returnTo: document.location.origin } 
		})
	}
}

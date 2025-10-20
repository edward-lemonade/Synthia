import { Component, computed, inject, Inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, DOCUMENT } from '@angular/common';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { UserService } from '@src/app/services/user.service';
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from '@angular/material/icon';
import { AvatarComponent } from '@src/app/components/avatar/avatar.component';
import { ApiService } from '@src/app/services/api.service';

import { v4 as uuidv4 } from 'uuid';

@Component({
	selector: 'app-appbar-layout',
	imports: [CommonModule, RouterModule, MatButtonModule, MatMenuModule, MatIconModule, AvatarComponent],
	template: `
		<div class="page-container">
			<ng-container *ngIf="(auth.isAuthenticated$ | async)">	
				<div class="appbar">
					<div class="left">
						<div class="title-button" (click)="title()">Synthia</div>
					</div>

					<div class="nav">
						<button 
							class="appbar-btn-fill" 
							(click)="studio()">
							Studio
						</button>
						<button 
							class="appbar-btn" 
							routerLink="/projects" 
							routerLinkActive="appbar-btn-active"
							[routerLinkActiveOptions]="{ exact: false }">
							Projects
						</button>
						<button 
							class="appbar-btn" 
							routerLink="/discover" 
							routerLinkActive="appbar-btn-active"
							[routerLinkActiveOptions]="{ exact: false }">
							Discover
						</button>
						<button 
							class="appbar-btn" 
							[routerLink]="['/profile', userDisplayName()]" 
							routerLinkActive="appbar-btn-active"
							[routerLinkActiveOptions]="{ exact: false }">
							Profile
						</button>
					</div>

					<div class="right">
						<button 
							class="profile-picture-button"
							[matMenuTriggerFor]="userSettings">
							<app-avatar 
								[width]="40"
								[profilePictureURL]="userPicture()"
								[altText]="'Profile picture'"
								[iconName]="'account_circle'">
							</app-avatar>
						</button>
					</div>

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

				</div>

				<div class="page-content">
					<router-outlet></router-outlet>
				</div>
			</ng-container>

			<ng-container *ngIf="!(auth.isAuthenticated$ | async)">
				<div class="appbar">
					<div class="left">
						<div class="title-button" (click)="title()">Synthia</div>
					</div>

					<div class="nav">
						<button 
							class="appbar-btn-fill" 
							(click)="studio()">
							Studio
						</button>
						<button 
							class="appbar-btn" 
							routerLink="/discover" 
							routerLinkActive="appbar-btn-active"
							[routerLinkActiveOptions]="{ exact: false }">
							Discover
						</button>
					</div>

					<div class="right">
						<button 
							class="appbar-btn"
							(click)="auth.loginWithRedirect({
							appState: { target: '/projects/all-projects' }
						})"> Register </button>
						<button 
							class="login-btn"
							(click)="auth.loginWithRedirect({
							appState: { target: '/projects/all-projects' }
						})"> Login </button>
					</div>
				</div>

				<div class="page-content">
					<router-outlet></router-outlet>
				</div>
			</ng-container>
		</div>

		<div class="particle-container">
			<div class="particle" style="top: -30%; left: 10%;"></div>
			<div class="particle" style="top: -30%; left: 80%;"></div>
			<div class="particle" style="top: -30%; left: 70%;"></div>
			<div class="particle" style="top: -30%; left: 20%;"></div>
			<div class="particle" style="top: -30%; left: 50%;"></div>
			<div class="particle" style="top: -30%; left: 40%;"></div>
			<div class="particle" style="top: -30%; left: 90%;"></div>
			<div class="particle" style="top: -30%; left: 60%;"></div>
			<div class="particle" style="top: -30%; left: 30%;"></div>
			<div class="particle" style="top: -30%; left: 15%;"></div>
			<div class="particle" style="top: -30%; left: 75%;"></div>
			<div class="particle" style="top: -30%; left: 5%;"></div>
		</div>
	`,
	styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent {
	private userService = inject(UserService);
	private apiService = inject(ApiService);

	constructor(
		@Inject(DOCUMENT) public document: Document, 
		public auth: AuthService,
		public appAuthService: AppAuthService,
		public router: Router,
	) {}

	userDisplayName = computed(() => { return this.userService.user()?.displayName })
	userPicture = computed(() => { return this.userService.user()?.profilePictureURL });

	title() {
		this.router.navigate(['/']);
	}

	profile() {
		this.router.navigate(['/profile', this.userDisplayName()]);
	}

	settings() {
		this.router.navigate(['/settings']);
	}

	discover() {
		this.router.navigate(['/discover']);
	}

	logout() {
		this.auth.logout({ 
			logoutParams: { returnTo: document.location.origin } 
		})
	}

	studio() {
		try {
			const projectId = uuidv4();
			this.router.navigate(['/studio', projectId], {queryParams: {
				isNew: true,
			}});
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}
}
import { Component, Inject } from '@angular/core';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '@auth0/auth0-angular';
import { CommonModule, DOCUMENT } from '@angular/common';

@Component({
	selector: 'app-appbar',
	imports: [CommonModule, MatButtonModule, MatToolbarModule],
	template: `
		<mat-toolbar color="primary">
			<span>NoteFlyte</span>
			<span class="spacer"></span>

			<ng-container *ngIf="auth.isAuthenticated$ | async; else loggedOut">
				
				<button (click)="auth.logout({ logoutParams: { returnTo: document.location.origin } })">
					Log out
				</button>
			</ng-container>

			<ng-template #loggedOut>
				<button (click)="auth.loginWithRedirect()" mat-button>
					Login
				</button>
			</ng-template>
		</mat-toolbar>
	`,
	styles: [`
		.spacer {
			flex: 1 1 auto;
		}
  	`]
})
export class AppbarComponent {
	constructor(
		@Inject(DOCUMENT) public document: Document, 
		public auth: AuthService
	) {}
}

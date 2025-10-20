import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { filter, take } from 'rxjs/operators';
import { UserService } from './user.service';

@Injectable({
	providedIn: 'root'
})
export class AuthCallbackService {
	constructor(
		private auth: AuthService,
		private router: Router
	) {
		this.handleAuthCallback();
	}

	private handleAuthCallback() {
		this.auth.appState$.pipe(
			filter(appState => !!appState),
			take(1)
		).subscribe(async (appState) => {
			if (appState && appState.target) {
				const targetUrl = appState.target;
				await UserService.instance.initializeUser();
				this.router.navigateByUrl(targetUrl);
			}
		});
	}
}

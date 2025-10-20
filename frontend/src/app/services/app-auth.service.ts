import { Injectable, Injector } from '@angular/core';
import { AuthService as Auth0Service, User as UserAuth } from '@auth0/auth0-angular';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { filter, distinctUntilChanged, take } from 'rxjs/operators';
import { environment } from '@src/environments/environment.dev';
import { UserService } from './user.service';
import { Router } from '@angular/router';


@Injectable({ providedIn: 'root' })
export class AppAuthService {
	private static _instance: AppAuthService;
	static get instance(): AppAuthService { return AppAuthService._instance; }

	constructor(
		private auth0: Auth0Service,
		private router: Router,
		private injector: Injector
	) {
		AppAuthService._instance = this;
		this.initializeAuth();
		this.handleAuthCallback();
	}

	private userAuth: UserAuth | null = null;
	private userAuthSubject = new BehaviorSubject<UserAuth | null>(null);
	private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
	private authCheckCompleteSubject = new BehaviorSubject<boolean>(false);
	
	getUserAuth(): UserAuth | null { return this.userAuth; }
	getUserAuth$(): Observable<UserAuth | null> { return this.userAuthSubject.asObservable(); }
	isAuthenticated$(): Observable<boolean> { return this.isAuthenticatedSubject.asObservable(); }

	private initializeAuth() {
		// Listen to authentication state changes
		this.auth0.isAuthenticated$.pipe(
			distinctUntilChanged()
		).subscribe(isAuthenticated => {
			this.isAuthenticatedSubject.next(isAuthenticated);
			this.authCheckCompleteSubject.next(true);
		});

		this.auth0.user$.subscribe(user => {
			this.userAuth = user || null;
			this.userAuthSubject.next(this.userAuth);
		});
	}

	async waitForAuthCheck(): Promise<void> {
		await firstValueFrom(
			this.authCheckCompleteSubject.pipe(
				filter(complete => complete === true)
			)
		);
	}

	async getAccessToken(): Promise<string> {
		return firstValueFrom(
			this.auth0.getAccessTokenSilently({
				authorizationParams: {
					audience: environment.AUTH0_API_AUD,
					prompt: 'consent'
				}
			})
		);
	}

	async getAuthHeaders(): Promise<{ [key: string]: string } | null> {
		try {
			const token = await this.getAccessToken();
			const user = this.getUserAuth();

			if (!!user && !!token) {
				return { Authorization: `Bearer ${token}` };
			}
		} catch (error) {
			console.log('User not authenticated, proceeding without auth headers');
		}
		return null;
	}

	private handleAuthCallback() {
		this.auth0.appState$.pipe(
			filter(appState => !!appState),
			take(1)
		).subscribe(async (appState) => {
			if (appState && appState.target) {
				const targetUrl = appState.target;

				const { UserService } = await import('./user.service'); // lazy load so no circular deps
				const userService = this.injector.get(UserService);
				await UserService.instance.initializeUser();

				this.router.navigateByUrl(targetUrl);
			}
		});
	}
}
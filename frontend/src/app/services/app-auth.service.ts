import { Injectable, signal } from '@angular/core';
import { AuthService as Auth0Service, User as UserAuth } from '@auth0/auth0-angular';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from '@src/environments/environment.dev';


@Injectable({ providedIn: 'root' })
export class AppAuthService {
	private static _instance: AppAuthService;
	static get instance(): AppAuthService { return AppAuthService._instance; }

	constructor(private auth0: Auth0Service) {
		AppAuthService._instance = this;
		this.initializeUser();
	}

	private userAuth: UserAuth | null = null;
	private userAuthSubject = new BehaviorSubject<UserAuth | null>(null);
	private userLoadedSubject = new BehaviorSubject<boolean>(false);
	getUserAuth(): UserAuth | null { return this.userAuth; }
	getUserAuth$() { return this.userAuthSubject.asObservable(); }

	private initializeUser() {
		this.auth0.user$.pipe(
			filter((user): user is UserAuth => !!user)
		).subscribe(user => {
			this.userAuth = user;
			this.userAuthSubject.next(this.userAuth);
			this.userLoadedSubject.next(true);
		});
	}

	private async waitForUserInit(): Promise<void> {
		await firstValueFrom(
			this.userLoadedSubject.pipe(filter(loaded => loaded))
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

	async getAuthHeaders(): Promise<{ [key: string]: string }> {
		try {
			await this.waitForUserInit();

			const token = await this.getAccessToken();
			const user = this.getUserAuth();

			if (!!user && !!token) {
				return { Authorization: `Bearer ${token}` };
			}
		} catch (error) {
			console.log('User not authenticated, proceeding without auth headers');
		}
		return {};
	}
}
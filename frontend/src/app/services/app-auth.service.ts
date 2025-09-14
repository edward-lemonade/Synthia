import { Injectable } from '@angular/core';
import { AuthService as Auth0Service, User as UserAuth } from '@auth0/auth0-angular';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { env } from '@env/environment';


@Injectable({ providedIn: 'root' })
export class AppAuthService {
	private static _instance: AppAuthService;
	static get instance(): AppAuthService { return AppAuthService._instance; }

	constructor(private auth0: Auth0Service) {
		console.log("app auth service")
		AppAuthService._instance = this;
		this.initializeUser();
	}

	private userAuth: UserAuth | null = null;
	private userAuthSubject = new BehaviorSubject<UserAuth | null>(null);
	getUserAuth(): UserAuth | null { return this.userAuth; }
	getUserAuth$() { return this.userAuthSubject.asObservable(); }

	private initializeUser() {
		this.auth0.user$.pipe(
			filter((user): user is UserAuth => !!user)
		).subscribe(user => {
			this.userAuth = user;
			this.userAuthSubject.next(this.userAuth);
		});
	}

	async getAccessToken(): Promise<string> {
		return firstValueFrom(
			this.auth0.getAccessTokenSilently({
				authorizationParams: {
					audience: env.auth0_api_aud,
					prompt: 'consent'
				}
			})
		);
	}
}
import { Injectable } from '@angular/core';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { env } from '@env/environment';
import { Author } from '@shared/types/Author';


@Injectable({ providedIn: 'root' })
export class AppAuthService {
	private user: User | null = null;
  	private userSubject = new BehaviorSubject<User | null>(null);
	private author: Author | null = null; // for studio pages

	constructor(private auth0: Auth0Service) {
		this.auth0.user$.pipe(
			filter((user): user is User => !!user)  
		).subscribe(user => {
			this.userSubject.next(user);
			this.user = user;
			this.author = {
				userId: user.sub!,
				username: user.name || user.email || "",
			}
		});
	}

	getUser(): User | null { return this.user }
	getUser$() { return this.userSubject.asObservable() }
	getAuthor(): Author | null { return this.author }

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

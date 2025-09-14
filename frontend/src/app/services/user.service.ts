import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Author, User } from '@shared/types';
import { HttpClient } from '@angular/common/http';
import { AppAuthService } from './app-auth.service';
import { User as UserAuth } from '@auth0/auth0-angular';
import axios from 'axios';


@Injectable({ providedIn: 'root' })
export class UserService {
	private static _instance: UserService;
	static get instance(): UserService { return UserService._instance; }

	constructor(
		private http: HttpClient,
		private appAuthService: AppAuthService
	) {
		UserService._instance = this;
		this.getOrCreateUser();
	}

	private user: User | null = null;
	private userSubject = new BehaviorSubject<User | null>(null);
	private author: Author | null = null;
	private authorSubject = new BehaviorSubject<Author | null>(null);
	getUser(): User | null { return this.user; }
	getUser$() { return this.userSubject.asObservable(); }
	getAuthor(): Author | null { return this.author; }
	getAuthor$() { return this.authorSubject.asObservable(); }

	async getOrCreateUser(): Promise<User|void> {		
		try {
			const token = await this.appAuthService.getAccessToken();

			const res = await axios.get<{user: User}>(
				`/api/me`, 
				{ headers: { Authorization: `Bearer ${token}` }}
			);
			
			const user = res.data.user;

			this.user = res.data.user;
			this.userSubject.next(user);

			this.author = {
				userId: user.auth0Id,
				username: user.displayName
			};
			this.authorSubject.next(this.author);

			return user;

		} catch (err) {
			console.error('Error toggling like:', err);
			return;
		}
	}
}

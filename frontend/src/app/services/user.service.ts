import { computed, Injectable, signal, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Author, User } from '@shared/types';
import { HttpClient } from '@angular/common/http';
import { AppAuthService } from './app-auth.service';
import { User as UserAuth } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import axios from 'axios';


@Injectable({ providedIn: 'root' })
export class UserService {
	private static _instance: UserService;
	static get instance(): UserService { return UserService._instance; }

	private router = inject(Router);

	constructor(
		private http: HttpClient,
		private appAuthService: AppAuthService
	) {
		UserService._instance = this;
		this.initializeUser();
	}

	user = signal<User|null>(null);
	isNewUser = signal<boolean>(false);
	author = computed<Author|null>(() => {
		const user = this.user();
		if (!user) {return null}
		return {
			userId: user?.auth0Id,
			displayName: user?.displayName,
		}
	});
	gotUser = false;

	private async initializeUser() {
		try {
			const user = await this.getUser();
			this.gotUser = true;
			this.checkAndRedirect();
		} catch (err) {
			console.error('Error initializing user:', err);
		}
	}

	async getUser(): Promise<User|null> {		
		try {
			const token = await this.appAuthService.getAccessToken();

			const res = await axios.get<{user: User | null, isNew: boolean}>(
				`/api/me`, 
				{ headers: { Authorization: `Bearer ${token}` }}
			);

			this.user.set(res.data.user);
			this.isNewUser.set(res.data.isNew);
			return res.data.user;

		} catch (err) {
			console.error('Error getting user:', err);
			return null;
		}
	}

	async createUser(userData: { displayName: string; bio?: string; profilePicture?: File }): Promise<User> {
		try {
			const token = await this.appAuthService.getAccessToken();

			const profileRes = await axios.put<{user: User}>(
				`/api/me/create`,
				{
					displayName: userData.displayName,
					bio: userData.bio
				},
				{ headers: { Authorization: `Bearer ${token}` }}
			);

			let user = profileRes.data.user;

			// If profile picture was provided, upload it
			if (userData.profilePicture) {
				const formData = new FormData();
				formData.append('profilePicture', userData.profilePicture);

				const pictureRes = await axios.put<{success: boolean, profilePictureURL: string}>(
					`/api/user/profile_picture`,
					formData,
					{ 
						headers: { 
							Authorization: `Bearer ${token}`,
							'Content-Type': 'multipart/form-data'
						}
					}
				);

				user = {...user, profilePictureURL: pictureRes.data.profilePictureURL};
			}

			this.user.set(user);
			this.isNewUser.set(false);
			this.gotUser = true;

			return user;
		} catch (err: any) {
			console.error('Error creating user:', err);
			throw new Error(err.response?.data?.error || 'Failed to create user');
		}
	}

	async updateProfile(profileData: { displayName?: string; bio?: string }): Promise<User> {
		try {
			const token = await this.appAuthService.getAccessToken();

			const res = await axios.put<{user: User}>(
				`/api/user/profile`,
				profileData,
				{ headers: { Authorization: `Bearer ${token}` }}
			);

			const user = res.data.user;
			this.user.set(user);

			// Check if user still needs account setup after profile update
			this.checkAndRedirect();

			return user;
		} catch (err: any) {
			console.error('Error updating profile:', err);
			throw new Error(err.response?.data?.error || 'Failed to update profile');
		}
	}

	async updateProfilePicture(file: File): Promise<User> {
		try {
			const token = await this.appAuthService.getAccessToken();

			const formData = new FormData();
			formData.append('profilePicture', file);

			const res = await axios.put<{success: boolean, profilePictureURL: string}>(
				`/api/user/profile_picture`,
				formData,
				{ 
					headers: { 
						Authorization: `Bearer ${token}`,
						'Content-Type': 'multipart/form-data'
					}
				}
			);

			const newUser = {...this.user()!, profilePictureURL: res.data.profilePictureURL};
			this.user.set(newUser);

			// Check if user still needs account setup after profile picture update
			this.checkAndRedirect();
			return this.user()!;
		} catch (err: any) {
			console.error('Error updating profile picture:', err);
			throw new Error(err.response?.data?.error || 'Failed to update profile picture');
		}
	}

	checkAndRedirect() {
		if (this.needsAccountSetup()) {
			this.router.navigate(['/registration']);
		}
	}
	needsAccountSetup(): boolean {
		if (!this.gotUser) { return false; }
		const user = this.user();
		return !user || !user.displayName || user.displayName.trim() === '';
	}

}

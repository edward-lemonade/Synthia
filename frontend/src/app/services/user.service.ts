import { computed, Injectable, signal, inject } from '@angular/core';
import { Author, User } from '@shared/types';
import { AppAuthService } from './app-auth.service';
import { AuthService, User as UserAuth } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { filter, switchMap, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';


@Injectable({ providedIn: 'root' })
export class UserService {
	private static _instance: UserService;
	static get instance(): UserService { return UserService._instance; }

	private router = inject(Router);

	constructor(
		private auth: AuthService,
		private appAuthService: AppAuthService,
		private apiService: ApiService,
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
	private returnUrl: string | null = null;
	private userFetchInProgress = false;
	private userFetchPromise: Promise<User|null> | null = null;

	async initializeUser() {
		// Automatically fetch user when authenticated
		this.appAuthService.isAuthenticated$().pipe(
			filter(isAuthenticated => isAuthenticated === true),
			switchMap(() => this.appAuthService.getUserAuth$()),
			filter(userAuth => !!userAuth),
			take(1) // Only trigger once per authentication session
		).subscribe(async () => {
			try {
				await this.getUser();
				this.checkAndRedirect();
			} catch (err) {
				console.error('Error fetching user after authentication:', err);
			}
		});
	}

	checkAndRedirect(saveUrl = true) {
		if (this.needsAccountSetup()) {
			if (saveUrl) {
				this.returnUrl = this.router.url;
			}
			this.router.navigate(['/registration']);
		}
	}

	needsAccountSetup(): boolean {
		if (!this.gotUser) { return false; }
		const user = this.user();
		return !user || !user.displayName || user.displayName.trim() === '';
	}

	// ====================================================================================
	// Wait for User/Author

	async waitForUser(): Promise<User|null> {
		if (this.gotUser) {
			return this.user();
		}

		if (this.userFetchInProgress && this.userFetchPromise) { // fetch in progress
			return this.userFetchPromise;
		}

		await this.appAuthService.waitForAuthCheck();

		const isAuthenticated = await firstValueFrom(this.appAuthService.isAuthenticated$());
		if (!isAuthenticated) {
			return null;
		}

		if (this.userFetchInProgress && this.userFetchPromise) {
			return this.userFetchPromise;
		}

		// Try fetching again
		if (!this.gotUser) {
			return this.getUser();
		}

		return this.user();
	}

	async waitForAuthor(): Promise<Author|null> {
		const user = await this.waitForUser();
		if (!user) {
			return null;
		}
		return this.author();
	}

	// ====================================================================================
	// API Calls

	async getUser(): Promise<User|null> {		
		if (this.userFetchInProgress && this.userFetchPromise) {
			return this.userFetchPromise;
		}

		this.userFetchInProgress = true;
		
		this.userFetchPromise = (async () => {
			try {
				const res = await ApiService.instance.routes.getMe();

				this.user.set(res.data.user);
				this.isNewUser.set(res.data.isNew);
				this.gotUser = true;
				return res.data.user;

			} catch (err) {
				console.log('Unable to get user, either user does not exist or user is a guest.', err);
				this.gotUser = true; // Mark as complete even on error
				return null;
			}
		})();

		try {
			const user = await this.userFetchPromise;
			return user;
		} finally {
			this.userFetchInProgress = false;
			this.userFetchPromise = null;
		}
	}

	async createUser(userData: { displayName: string; bio?: string; profilePicture?: File }): Promise<User> {
		try {
			const profileRes = await ApiService.instance.routes.createMe({
				data: {
					displayName: userData.displayName,
					bio: userData.bio
				}
			});

			let user = profileRes.data.user;
			if (!user) { throw new Error('User creation failed'); }
			UserService.instance.user.set(user);

			try {
				// If profile picture was provided, upload it
				if (userData.profilePicture) {
					const formData = new FormData();
					formData.append('profilePicture', userData.profilePicture);

					const pictureRes = await ApiService.instance.routes.updateProfilePicture({
						data: formData,
						headers: { 'Content-Type': 'multipart/form-data' }
					}, )

					user = {...user, profilePictureURL: pictureRes.data.profilePictureURL};
				}
			} catch (err) {
				console.error('Error uploading profile picture during user creation:', err);
			}

			this.user.set(user);
			this.isNewUser.set(false);
			this.gotUser = true;

			// Navigate back to the stored URL if it exists
			if (this.returnUrl) {
				this.router.navigateByUrl(this.returnUrl);
				this.returnUrl = null; // Clear the stored URL
			}

			return user;
		} catch (err: any) {
			console.error('Error creating user:', err);
			throw new Error(err.response?.data?.error || 'Failed to create user');
		}
	}

	async updateProfile(profileData: { displayName?: string; bio?: string }): Promise<User> {
		try {
			const res = await ApiService.instance.routes.updateProfile({
				data: profileData
			})

			const user = res.data.user;
			this.user.set(user);

			// Check if user still needs account setup after profile update
			this.checkAndRedirect(false);

			return user;
		} catch (err: any) {
			console.error('Error updating profile:', err);
			throw new Error(err.response?.data?.error || 'Failed to update profile');
		}
	}

	async updateProfilePicture(file: File): Promise<User> {
		try {
			const formData = new FormData();
			formData.append('profilePicture', file);

			const res = await ApiService.instance.routes.updateProfilePicture({
				data: formData,
				headers: { 'Content-Type': 'multipart/form-data' }
			}, )

			const newUser = {...this.user()!, profilePictureURL: res.data.profilePictureURL};
			this.user.set(newUser);

			// Check if user still needs account setup after profile picture update
			this.checkAndRedirect(false);
			return this.user()!;
		} catch (err: any) {
			console.error('Error updating profile picture:', err);
			throw new Error(err.response?.data?.error || 'Failed to update profile picture');
		}
	}

}
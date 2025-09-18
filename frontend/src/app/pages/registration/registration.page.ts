import { Component, OnInit, OnDestroy, inject, Inject, effect } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { User } from '@shared/types';
import { UserService } from '@src/app/services/user.service';
import { Router } from '@angular/router';
import { AvatarComponent } from '@src/app/components/avatar/avatar.component';
import { AuthService } from '@auth0/auth0-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-registration',
	standalone: true,
	imports: [CommonModule, FormsModule, AvatarComponent, MatButtonModule, MatIconModule],
	template: `
		<div class="registration-container">
			<div class="registration-header">
				<div class="header-content">
					<div class="header-text">
						<h1>Welcome to Synthia!</h1>
						<p>Let's set up your profile to get started</p>
					</div>
					<button 
						mat-button 
						class="logout-btn"
						(click)="logout()"
						[disabled]="isSaving">
						<mat-icon>logout</mat-icon>
						Sign Out
					</button>
				</div>
			</div>

			<div class="registration-content">
				<form (ngSubmit)="completeRegistration()" #registrationForm="ngForm">
					<!-- Profile Picture Section -->
					<div class="registration-section">
						<h2>Profile Picture</h2>
						
						<div class="profile-picture-preview">
							<app-avatar 
								[width]="60"
								[profilePictureURL]="profilePicturePreview || user?.profilePictureURL"
								[altText]="'Profile picture preview'"
								[iconName]="'person'">
							</app-avatar>
						</div>
						
						<div class="form-group">
							<label for="profilePictureFile">Profile Picture (Optional)</label>
							<input 
								type="file" 
								id="profilePictureFile"
								accept="image/*"
								(change)="onFileSelected($event)"
								[disabled]="isSaving"
							>
							<div class="error-message" *ngIf="profilePictureError">{{ profilePictureError }}</div>
							<div class="help-text">Select an image file for your profile picture</div>
						</div>
					</div>

					<!-- Required Profile Information Section -->
					<div class="registration-section">
						<h2>Profile Information</h2>
						
						<div class="form-group">
							<label for="displayName">Display Name *</label>
							<input 
								type="text" 
								id="displayName"
								[(ngModel)]="displayName"
								name="displayName"
								(ngModelChange)="onDisplayNameChange()"
								[class.error]="displayNameError"
								placeholder="Enter your display name"
								[disabled]="isSaving"
								required
							>
							<div class="error-message" *ngIf="displayNameError">{{ displayNameError }}</div>
							<div class="help-text">1-30 characters, letters, numbers, and underscores only</div>
						</div>

						<div class="form-group">
							<label for="bio">Bio (Optional)</label>
							<textarea 
								id="bio"
								[(ngModel)]="bio"
								name="bio"
								(ngModelChange)="onBioChange()"
								[class.error]="bioError"
								placeholder="Tell us about yourself..."
								[disabled]="isSaving"
								rows="4"
							></textarea>
							<div class="error-message" *ngIf="bioError">{{ bioError }}</div>
							<div class="help-text">{{ (bio || '').length }}/200 characters</div>
						</div>
					</div>

					<!-- Messages -->
					<div class="messages">
						<div class="error-message" *ngIf="saveError">{{ saveError }}</div>
					</div>

					<!-- Submit Button -->
					<div class="form-actions">
						<button 
							type="submit"
							class="btn btn-primary btn-large"
							[disabled]="isSaving || displayNameError || bioError || profilePictureError || !displayName.trim()"
						>
							<span *ngIf="isSaving" class="spinner"></span>
							{{ isSaving ? 'Creating Profile...' : 'Complete Registration' }}
						</button>
					</div>
				</form>
			</div>
		</div>
	`,
	styleUrls: ['./registration.page.scss']
})
export class RegistrationPage implements OnDestroy {
	private destroy$ = new Subject<void>();

	constructor(
		public userService: UserService,
		private router: Router,
		public auth: AuthService,
		@Inject(DOCUMENT) public document: Document
	) {
		effect(() => {
			if (this.user && this.user.displayName) {
				this.router.navigate(['/projects']);
			}
		})
	}

	get user() { return this.userService.user() }
	
	displayName: string = '';
	bio: string = '';
	profilePicturePreview: string = '';
	selectedFile: File | null = null;

	isLoading = false;
	isSaving = false;
	saveError = '';
	
	displayNameError = '';
	bioError = '';
	profilePictureError = '';


	ngOnDestroy() {
		this.destroy$.next();
		this.destroy$.complete();
	}

	onFileSelected(event: any) {
		const file = event.target.files[0];
		if (file) {
			if (!file.type.startsWith('image/')) {
				this.profilePictureError = 'Please select an image file';
				return;
			}

			if (file.size > 5 * 1024 * 1024) {
				this.profilePictureError = 'File size must be less than 5MB';
				return;
			}

			this.selectedFile = file;
			this.profilePictureError = '';

			const reader = new FileReader();
			reader.onload = (e: any) => {
				this.profilePicturePreview = e.target.result;
			};
			reader.readAsDataURL(file);
		}
	}

	validateDisplayName(): boolean {
		if (!this.displayName || this.displayName.trim().length === 0) {
			this.displayNameError = 'Display name is required';
			return false;
		}
		
		if (this.displayName.length > 30) {
			this.displayNameError = 'Display name must be 30 characters or less';
			return false;
		}
		
		if (!/^[a-zA-Z0-9_]+$/.test(this.displayName)) {
			this.displayNameError = 'Display name can only contain letters, numbers, and underscores';
			return false;
		}
		
		this.displayNameError = '';
		return true;
	}

	validateBio(): boolean {
		if (this.bio && this.bio.length > 200) {
			this.bioError = 'Bio must be 200 characters or less';
			return false;
		}
		
		this.bioError = '';
		return true;
	}

	validateProfilePicture(): boolean {
		if (this.selectedFile) {
			return !this.profilePictureError;
		}
		
		this.profilePictureError = '';
		return true;
	}

	onDisplayNameChange() {
		this.validateDisplayName();
		this.clearMessages();
	}
	onBioChange() {
		this.validateBio();
		this.clearMessages();
	}

	clearMessages() {
		this.saveError = '';
	}

	async completeRegistration() {
		if (!this.validateDisplayName() || !this.validateBio() || !this.validateProfilePicture()) {
			return;
		}

		if (!this.displayName || !this.displayName.trim()) {
			this.displayNameError = 'Display name is required';
			return;
		}

		this.isSaving = true;
		this.clearMessages();

		try {
			await this.userService.createUser({
				displayName: this.displayName.trim(),
				bio: this.bio?.trim() || undefined,
				profilePicture: this.selectedFile || undefined
			});

			this.router.navigate(['/projects']);
		} catch (error: any) {
			this.saveError = error.message || 'Failed to complete registration';
		} finally {
			this.isSaving = false;
		}
	}

	logout() {
		this.auth.logout({ 
			logoutParams: { returnTo: this.document.location.origin } 
		});
	}
}

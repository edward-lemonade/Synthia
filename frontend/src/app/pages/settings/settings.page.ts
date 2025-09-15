import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { User } from '@shared/types';
import { UserService } from '@src/app/services/user.service';

@Component({
	selector: 'app-settings',
	standalone: true,
	imports: [CommonModule, FormsModule],
	template: `
		<div class="settings-container">
			<div class="settings-header">
				<h1>Settings</h1>
				<p>Manage your profile information and preferences</p>
			</div>

			<div class="settings-content">
				<!-- Profile Information Section -->
				<div class="settings-section">
					<h2>Profile Information</h2>
					
					<div class="form-group">
						<label for="displayName">Display Name</label>
						<input 
							type="text" 
							id="displayName"
							[(ngModel)]="displayName"
							(ngModelChange)="onDisplayNameChange()"
							[class.error]="displayNameError"
							placeholder="Enter your display name"
							[disabled]="isSaving"
						>
						<div class="error-message" *ngIf="displayNameError">{{ displayNameError }}</div>
						<div class="help-text">1-30 characters, letters, numbers, and underscores only</div>
					</div>

					<div class="form-group">
						<label for="bio">Bio</label>
						<textarea 
							id="bio"
							[(ngModel)]="bio"
							(ngModelChange)="onBioChange()"
							[class.error]="bioError"
							placeholder="Tell us about yourself..."
							[disabled]="isSaving"
							rows="4"
						></textarea>
						<div class="error-message" *ngIf="bioError">{{ bioError }}</div>
						<div class="help-text">{{ bio?.length ?? 0 }}/200 characters</div>
					</div>

					<div class="form-actions">
						<button 
							class="btn btn-primary"
							(click)="saveProfile()"
							[disabled]="isSaving || displayNameError || bioError"
						>
							<span *ngIf="isSaving" class="spinner"></span>
							{{ isSaving ? 'Saving...' : 'Save Profile' }}
						</button>
					</div>
				</div>

				<!-- Profile Picture Section -->
				<div class="settings-section">
					<h2>Profile Picture</h2>
					
					<div class="profile-picture-preview" *ngIf="profilePicturePreview">
						<img [src]="profilePicturePreview" alt="Profile picture preview" (error)="profilePicturePreview = ''">
					</div>
					
					<div class="form-group">
						<label for="profilePictureFile">Profile Picture</label>
						<input 
							type="file" 
							id="profilePictureFile"
							accept="image/*"
							(change)="onFileSelected($event)"
							[disabled]="isSaving"
						>
						<div class="error-message" *ngIf="profilePictureError">{{ profilePictureError }}</div>
						<div class="help-text">Select an image file for your profile picture (optional)</div>
					</div>

					<div class="form-actions">
						<button 
							class="btn btn-secondary"
							(click)="saveProfilePicture()"
							[disabled]="isSaving || profilePictureError || !selectedFile"
						>
							<span *ngIf="isSaving" class="spinner"></span>
							{{ isSaving ? 'Saving...' : 'Save Picture' }}
						</button>
					</div>
				</div>


				<!-- Messages -->
				<div class="messages">
					<div class="success-message" *ngIf="saveMessage">{{ saveMessage }}</div>
					<div class="error-message" *ngIf="saveError">{{ saveError }}</div>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./settings.page.scss']
})
export class SettingsPage implements OnDestroy {
	private destroy$ = new Subject<void>();

	constructor(
		public userService: UserService,
	) {}

	get user() { return this.userService.user() }
	
	get displayName() { return this.user?.displayName ?? null };
	get bio() { return this.user?.bio ?? null };
	get profilePictureURL() { return this.user?.profilePictureURL ?? null };
	profilePicturePreview: string = '';
	selectedFile: File | null = null;

	isLoading = false;
	isSaving = false;
	saveMessage = '';
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

			// Create preview
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

	onProfilePictureChange() {
		this.validateProfilePicture();
		this.clearMessages();
	}

	clearMessages() {
		this.saveMessage = '';
		this.saveError = '';
	}

	async saveProfile() {
		if (!this.validateDisplayName() || !this.validateBio() || !this.validateProfilePicture()) {
			return;
		}

		this.isSaving = true;
		this.clearMessages();

		try {
			await this.userService.updateProfile({
				displayName: this.displayName ?? undefined,
				bio: this.bio ?? undefined
			});

			this.saveMessage = 'Profile updated successfully!';
		} catch (error: any) {
			this.saveError = error.message || 'Failed to update profile';
		} finally {
			this.isSaving = false;
		}
	}

	async saveProfilePicture() {
		if (!this.validateProfilePicture()) {
			return;
		}

		if (!this.selectedFile) {
			this.profilePictureError = 'Please select a file';
			return;
		}

		this.isSaving = true;
		this.clearMessages();

		try {
			await this.userService.updateProfilePicture(this.selectedFile);
			this.saveMessage = 'Profile picture updated successfully!';
		} catch (error: any) {
			this.saveError = error.message || 'Failed to update profile picture';
		} finally {
			this.isSaving = false;
		}
	}

}

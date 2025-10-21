import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPage } from './settings.page';
import { UserService } from '@src/app/services/user.service';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';

describe('SettingsPage', () => {
	let component: SettingsPage;
	let fixture: ComponentFixture<SettingsPage>;
	let userServiceMock: jasmine.SpyObj<UserService>;

	beforeEach(async () => {
		userServiceMock = jasmine.createSpyObj('UserService', ['updateProfile', 'updateProfilePicture'], {
			user: signal({
				displayName: 'Test User',
				bio: 'Test bio',
				profilePictureURL: 'avatar.jpg'
			})
		});

		await TestBed.configureTestingModule({
			imports: [SettingsPage],
			providers: [
				{ provide: UserService, useValue: userServiceMock },
			]
		}).compileComponents();

		fixture = TestBed.createComponent(SettingsPage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize with user data', () => {
		expect(component.displayName()).toBe('Test User');
		expect(component.bio()).toBe('Test bio');
	});

	it('should render settings header', () => {
		const header = fixture.debugElement.query(By.css('h1'));
		const subtext = fixture.debugElement.query(By.css('.settings-header p'));
		
		expect(header.nativeElement.textContent.trim()).toBe('Settings');
		expect(subtext.nativeElement.textContent.trim()).toBe('Manage your profile information and preferences');
	});

	it('should render profile information section', () => {
		const section = fixture.debugElement.query(By.css('.settings-section h2'));
		const displayNameInput = fixture.debugElement.query(By.css('#displayName'));
		const bioTextarea = fixture.debugElement.query(By.css('#bio'));
		
		expect(section.nativeElement.textContent.trim()).toBe('Profile Information');
		expect(displayNameInput.nativeElement.type).toBe('text');
		expect(bioTextarea.nativeElement.tagName).toBe('TEXTAREA');
	});

	it('should render profile picture section', () => {
		const section = fixture.debugElement.query(By.css('.settings-section:nth-child(2) h2'));
		const fileInput = fixture.debugElement.query(By.css('#profilePictureFile'));
		
		expect(section.nativeElement.textContent.trim()).toBe('Profile Picture');
		expect(fileInput.nativeElement.type).toBe('file');
		expect(fileInput.nativeElement.accept).toBe('image/*');
	});

	it('should validate display name correctly', () => {
		// Test empty display name
		component.displayName.set('');
		expect(component.validateDisplayName()).toBeFalse();
		expect(component.displayNameError).toBe('Display name is required');

		// Test too long display name
		component.displayName.set('a'.repeat(31));
		expect(component.validateDisplayName()).toBeFalse();
		expect(component.displayNameError).toBe('Display name must be 30 characters or less');

		// Test invalid characters
		component.displayName.set('test@user');
		expect(component.validateDisplayName()).toBeFalse();
		expect(component.displayNameError).toBe('Display name can only contain letters, numbers, and underscores');

		// Test valid display name
		component.displayName.set('test_user123');
		expect(component.validateDisplayName()).toBeTrue();
		expect(component.displayNameError).toBe('');
	});

	it('should validate bio correctly', () => {
		// Test bio too long
		component.bio.set('a'.repeat(201));
		expect(component.validateBio()).toBeFalse();
		expect(component.bioError).toBe('Bio must be 200 characters or less');

		// Test valid bio
		component.bio.set('Valid bio');
		expect(component.validateBio()).toBeTrue();
		expect(component.bioError).toBe('');
	});

	it('should validate profile picture file', () => {
		const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
		const event = { target: { files: [mockFile] } };

		component.onFileSelected(event);

		expect(component.profilePictureError).toBe('Please select an image file');
		expect(component.selectedFile).toBeNull();
	});

	it('should accept valid image file', () => {
		const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
		const event = { target: { files: [mockFile] } };

		component.onFileSelected(event);

		expect(component.profilePictureError).toBe('');
		expect(component.selectedFile).toBe(mockFile);
	});

	it('should call updateProfile on save profile', async () => {
		component.displayName.set('newuser');
		component.bio.set('New bio');
		userServiceMock.updateProfile.and.returnValue(Promise.resolve({} as any));

		await component.saveProfile();

		expect(userServiceMock.updateProfile).toHaveBeenCalledWith({
			displayName: 'newuser',
			bio: 'New bio'
		});
		expect(component.saveMessage).toBe('Profile updated successfully!');
	});

	it('should handle updateProfile error', async () => {
		component.displayName.set('newuser');
		userServiceMock.updateProfile.and.returnValue(Promise.reject(new Error('API Error')));

		await component.saveProfile();

		expect(component.saveError).toBe('API Error');
		expect(component.isSaving).toBeFalse();
	});

	it('should call updateProfilePicture on save picture', async () => {
		const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
		component.selectedFile = mockFile;
		userServiceMock.updateProfilePicture.and.returnValue(Promise.resolve({} as any));

		await component.saveProfilePicture();

		expect(userServiceMock.updateProfilePicture).toHaveBeenCalledWith(mockFile);
		expect(component.saveMessage).toBe('Profile picture updated successfully!');
	});

	it('should handle updateProfilePicture error', async () => {
		const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
		component.selectedFile = mockFile;
		userServiceMock.updateProfilePicture.and.returnValue(Promise.reject(new Error('API Error')));

		await component.saveProfilePicture();

		expect(component.saveError).toBe('API Error');
		expect(component.isSaving).toBeFalse();
	});

	it('should require file for profile picture save', async () => {
		component.selectedFile = null;

		await component.saveProfilePicture();

		expect(component.profilePictureError).toBe('Please select a file');
		expect(userServiceMock.updateProfilePicture).not.toHaveBeenCalled();
	});

	it('should clear messages on input change', () => {
		component.saveError = 'Test error';
		component.saveMessage = 'Test message';

		component.onDisplayNameChange();

		expect(component.saveError).toBe('');
		expect(component.saveMessage).toBe('');
	});

	it('should disable save profile button when form is invalid', () => {
		component.displayName.set('');
		component.isSaving = false;
		fixture.detectChanges();

		const saveBtn = fixture.debugElement.query(By.css('.btn-primary'));
		expect(saveBtn.nativeElement.disabled).toBeTrue();
	});

	it('should show loading state when saving', () => {
		component.isSaving = true;
		fixture.detectChanges();

		const saveBtn = fixture.debugElement.query(By.css('.btn-primary'));
		expect(saveBtn.nativeElement.textContent.trim()).toBe('Saving...');
	});

	it('should show character count for bio', () => {
		component.bio.set('Test bio');
		fixture.detectChanges();

		const helpTexts = fixture.debugElement.queryAll(By.css('.help-text'));
  		expect(helpTexts[1].nativeElement.textContent.trim()).toBe('8/200 characters');
	});
});

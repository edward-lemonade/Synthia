import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrationPage } from './registration.page';
import { UserService } from '@src/app/services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { DOCUMENT } from '@angular/common';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('RegistrationPage', () => {
  let component: RegistrationPage;
  let fixture: ComponentFixture<RegistrationPage>;
  let userServiceMock: jasmine.SpyObj<UserService>;
  let routerMock: jasmine.SpyObj<Router>;
  let authMock: jasmine.SpyObj<AuthService>;
  let documentMock: jasmine.SpyObj<Document>;

  beforeEach(async () => {
    userServiceMock = jasmine.createSpyObj('UserService', ['createUser'], {
      user: signal(null)
    });
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    authMock = jasmine.createSpyObj('AuthService', [
      'logout', 
      'loginWithRedirect', 
      'getAccessTokenSilently'
    ], {
      isAuthenticated$: { subscribe: jasmine.createSpy() },
      user$: of({ sub: 'user-123', name: 'Test User' })
    });
    
    // Set up default return values for auth methods
    authMock.getAccessTokenSilently.and.returnValue(of('mock-token'));
    documentMock = jasmine.createSpyObj('Document', [], {
      location: { origin: 'http://localhost:4200' }
    });

    await TestBed.configureTestingModule({
      imports: [RegistrationPage],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authMock },
        { provide: DOCUMENT, useValue: documentMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render welcome header', () => {
    const header = fixture.debugElement.query(By.css('h1'));
    const subtext = fixture.debugElement.query(By.css('.header-text p'));
    
    expect(header.nativeElement.textContent.trim()).toBe('Welcome to Synthia!');
    expect(subtext.nativeElement.textContent.trim()).toBe('Let\'s set up your profile to get started');
  });

  it('should render logout button', () => {
    const logoutBtn = fixture.debugElement.query(By.css('.logout-btn'));
    
    expect(logoutBtn.nativeElement.textContent.trim()).toContain('Sign Out');
  });

  it('should render profile picture section', () => {
    const section = fixture.debugElement.query(By.css('.registration-section:nth-child(1) h2'));
    const fileInput = fixture.debugElement.query(By.css('#profilePictureFile'));
    
    expect(section.nativeElement.textContent.trim()).toBe('Profile Picture');
    expect(fileInput.nativeElement.type).toBe('file');
    expect(fileInput.nativeElement.accept).toBe('image/*');
  });

  it('should render profile information section', () => {
    const section = fixture.debugElement.query(By.css('.registration-section:nth-child(2) h2'));
    const displayNameInput = fixture.debugElement.query(By.css('#displayName'));
    const bioTextarea = fixture.debugElement.query(By.css('#bio'));
    
    expect(section.nativeElement.textContent.trim()).toBe('Profile Information');
    expect(displayNameInput.nativeElement.type).toBe('text');
    expect(displayNameInput.nativeElement.required).toBeTrue();
    expect(bioTextarea.nativeElement.tagName).toBe('TEXTAREA');
  });

  it('should render submit button', () => {
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    
    expect(submitBtn.nativeElement.textContent.trim()).toBe('Complete Registration');
  });

  it('should validate display name correctly', () => {
    // Test empty display name
    component.displayName = '';
    expect(component.validateDisplayName()).toBeFalse();
    expect(component.displayNameError).toBe('Display name is required');

    // Test too long display name
    component.displayName = 'a'.repeat(31);
    expect(component.validateDisplayName()).toBeFalse();
    expect(component.displayNameError).toBe('Display name must be 30 characters or less');

    // Test invalid characters
    component.displayName = 'test@user';
    expect(component.validateDisplayName()).toBeFalse();
    expect(component.displayNameError).toBe('Display name can only contain letters, numbers, and underscores');

    // Test valid display name
    component.displayName = 'test_user123';
    expect(component.validateDisplayName()).toBeTrue();
    expect(component.displayNameError).toBe('');
  });

  it('should validate bio correctly', () => {
    // Test bio too long
    component.bio = 'a'.repeat(201);
    expect(component.validateBio()).toBeFalse();
    expect(component.bioError).toBe('Bio must be 200 characters or less');

    // Test valid bio
    component.bio = 'Valid bio';
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

  it('should reject file too large', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(mockFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB
    const event = { target: { files: [mockFile] } };

    component.onFileSelected(event);

    expect(component.profilePictureError).toBe('File size must be less than 5MB');
    expect(component.selectedFile).toBeNull();
  });

  it('should call createUser on form submission', async () => {
    component.displayName = 'testuser';
    component.bio = 'Test bio';
    component.selectedFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    userServiceMock.createUser.and.returnValue(Promise.resolve({} as any));

    await component.completeRegistration();

    expect(userServiceMock.createUser).toHaveBeenCalledWith({
      displayName: 'testuser',
      bio: 'Test bio',
      profilePicture: component.selectedFile
    });
    expect(routerMock.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should handle createUser error', async () => {
    component.displayName = 'testuser';
    userServiceMock.createUser.and.returnValue(Promise.reject(new Error('API Error')));

    await component.completeRegistration();

    expect(component.saveError).toBe('API Error');
    expect(component.isSaving).toBeFalse();
  });

  it('should call logout when logout button clicked', () => {
    const logoutBtn = fixture.debugElement.query(By.css('.logout-btn'));
    logoutBtn.triggerEventHandler('click', null);

    expect(authMock.logout).toHaveBeenCalledWith({
      logoutParams: { returnTo: 'http://localhost:4200' }
    });
  });

  it('should clear messages on input change', () => {
    component.saveError = 'Test error';
    component.displayNameError = 'Test error';

    component.onDisplayNameChange();

    expect(component.saveError).toBe('');
  });

  it('should disable submit button when form is invalid', () => {
    component.displayName = '';
    component.isSaving = false;
    fixture.detectChanges();

    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBeTrue();
  });

  it('should show loading state when saving', () => {
    component.isSaving = true;
    fixture.detectChanges();

    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.textContent.trim()).toBe('Creating Profile...');
  });
});

import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { ApiService } from './api.service';
import { AppAuthService } from './app-auth.service';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import axios from 'axios';

describe('UserService', () => {
	let service: UserService;
	let apiMock: any;
	let appAuthMock: any;
	let auth0Mock: any;
	let routerMock: any;

	beforeEach(() => {
		apiMock = {
			routes: {
				getMe: jasmine.createSpy('getMe'),
				createMe: jasmine.createSpy('createMe'),
				updateProfile: jasmine.createSpy('updateProfile'),
				updateProfilePicture: jasmine.createSpy('updateProfilePicture'),
			}
		};
		
		// Set the static instance for ApiService
		(ApiService as any)._instance = apiMock;

		// AppAuthService observables
		const isAuthenticated$ = new BehaviorSubject<boolean>(false);
		const userAuth$ = new BehaviorSubject<any>(null);
		appAuthMock = {
			isAuthenticated$: () => isAuthenticated$.asObservable(),
			getUserAuth$: () => userAuth$.asObservable(),
			waitForAuthCheck: jasmine.createSpy('waitForAuthCheck').and.returnValue(Promise.resolve()),
			getAuthHeaders: jasmine.createSpy('getAuthHeaders').and.returnValue(Promise.resolve({ Authorization: 'Bearer token' })),
		};

		auth0Mock = {} as Auth0Service;
		routerMock = { navigate: jasmine.createSpy('navigate'), navigateByUrl: jasmine.createSpy('navigateByUrl'), url: '/current' };

		TestBed.configureTestingModule({
			providers: [
				UserService,
				{ provide: ApiService, useValue: apiMock },
				{ provide: AppAuthService, useValue: appAuthMock },
				{ provide: Auth0Service, useValue: auth0Mock },
				{ provide: Router, useValue: routerMock },
			]
		});

		service = TestBed.inject(UserService);
		
		// Mock axios methods for API calls
		spyOn(axios, 'get').and.returnValue(Promise.resolve({ data: {} }) as any);
		spyOn(axios, 'post').and.returnValue(Promise.resolve({ data: {} }) as any);
		spyOn(axios, 'put').and.returnValue(Promise.resolve({ data: {} }) as any);
		spyOn(axios, 'patch').and.returnValue(Promise.resolve({ data: {} }) as any);
		spyOn(axios, 'delete').and.returnValue(Promise.resolve({ data: {} }) as any);
	});

	it('should create and set static instance', () => {
		expect(service).toBeTruthy();
		expect(UserService.instance).toBe(service);
	});

	it('needsAccountSetup false before first fetch', () => {
		expect(service.needsAccountSetup()).toBeFalse();
	});

	it('getUser sets user and isNew flags', async () => {
		const user = { auth0Id: '1', displayName: 'ed', profilePictureURL: '' } as any;
		apiMock.routes.getMe.and.returnValue(Promise.resolve({ data: { user, isNew: false } }));
		const res = await service.getUser();
		expect(res).toEqual(user);
		expect(service.user()).toEqual(user);
		expect(service.isNewUser()).toBeFalse();
	});

	it('needsAccountSetup true when user has empty displayName', async () => {
		const user = { auth0Id: '1', displayName: '' } as any;
		apiMock.routes.getMe.and.returnValue(Promise.resolve({ data: { user, isNew: true } }));
		await service.getUser();
		expect(service.needsAccountSetup()).toBeTrue();
	});

	it('createUser sets user and clears isNew', async () => {
		const created = { auth0Id: '1', displayName: 'ed' } as any;
		apiMock.routes.createMe.and.returnValue(Promise.resolve({ data: { user: created, isNew: false } }));
		apiMock.routes.updateProfilePicture.and.returnValue(Promise.resolve({ data: { profilePictureURL: 'url' } }));
		const res = await service.createUser({ displayName: 'ed' });
		expect(res.displayName).toBe('ed');
		expect(service.isNewUser()).toBeFalse();
	});

	it('updateProfile updates user signal', async () => {
		// First set up a user in the service
		const existingUser = { auth0Id: '1', displayName: 'old', profilePictureURL: '' } as any;
		service.user.set(existingUser);
		service.gotUser = true;
		
		const updated = { auth0Id: '1', displayName: 'new' } as any;
		apiMock.routes.updateProfile.and.returnValue(Promise.resolve({ data: { user: updated } }));
		const res = await service.updateProfile({ displayName: 'new' });
		expect(service.user()).toEqual(updated);
		expect(res).toEqual(updated);
	});
});



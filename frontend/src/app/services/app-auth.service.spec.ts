import { TestBed } from '@angular/core/testing';
import { AppAuthService } from './app-auth.service';
import { Router } from '@angular/router';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';
import { BehaviorSubject, of } from 'rxjs';

describe('AppAuthService', () => {
	let service: AppAuthService;
	let auth0Mock: any;
	let routerMock: any;

	beforeEach(() => {
		const isAuthenticated$ = new BehaviorSubject<boolean>(false);
		const user$ = new BehaviorSubject<any>(null);
		const appState$ = new BehaviorSubject<any>(null);

		auth0Mock = {
			isAuthenticated$,
			user$,
			appState$,
			getAccessTokenSilently: jasmine.createSpy('getAccessTokenSilently').and.returnValue(of('token')),
		};

		routerMock = {
			navigateByUrl: jasmine.createSpy('navigateByUrl'),
		};

		TestBed.configureTestingModule({
			providers: [
				AppAuthService,
				{ provide: Auth0Service, useValue: auth0Mock },
				{ provide: Router, useValue: routerMock },
			],
		});

		service = TestBed.inject(AppAuthService);
	});

	it('should create and expose observables', () => {
		expect(service).toBeTruthy();
		expect(AppAuthService.instance).toBe(service);
		service.isAuthenticated$().subscribe(val => expect(typeof val).toBe('boolean'));
		service.getUserAuth$().subscribe(val => expect(val === null || typeof val === 'object').toBeTrue());
	});

	it('getAuthHeaders should return a bearer header on success', async () => {
		(auth0Mock.getAccessTokenSilently as jasmine.Spy).and.returnValue(of('abc'));
		auth0Mock.user$.next({ sub: 'user_1' });
		const headers = await service.getAuthHeaders();
		expect(headers).toEqual({ Authorization: 'Bearer abc' });
	});

	it('waitForAuthCheck resolves after isAuthenticated$ emits', async () => {
		const p = service.waitForAuthCheck();
		auth0Mock.isAuthenticated$.next(true);
		await expectAsync(p).toBeResolved();
	});

	it('handleAuthCallback navigates when appState.target present', async () => {
		// force initialized
		auth0Mock.isAuthenticated$.next(true);
		auth0Mock.user$.next({ sub: '1' });
		auth0Mock.appState$.next({ target: '/home' });
		// allow microtasks to flush
		await new Promise(r => setTimeout(r));
		expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/home');
	});
});



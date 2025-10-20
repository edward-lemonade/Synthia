import { BehaviorSubject } from "rxjs";
import { AppState, AuthService as Auth0Service, User as UserAuth } from '@auth0/auth0-angular';

export function createMockAuth0Client() {
	return {
		loginWithRedirect: jasmine.createSpy('loginWithRedirect').and.returnValue(Promise.resolve()),
		logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
		getTokenSilently: jasmine.createSpy('getTokenSilently').and.returnValue(Promise.resolve('mock-token')),
		getUser: jasmine.createSpy('getUser').and.returnValue(Promise.resolve({ 
			sub: '123', 
			name: 'Test User',
			email: 'test@example.com'
		})),
		isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(Promise.resolve(true)),
		isAuthenticated$: new BehaviorSubject<boolean>(true),
		user$: new BehaviorSubject<UserAuth>({}),
		appState$: new BehaviorSubject<AppState>({}),
		handleRedirectCallback: jasmine.createSpy('handleRedirectCallback').and.returnValue(Promise.resolve())
	};
}
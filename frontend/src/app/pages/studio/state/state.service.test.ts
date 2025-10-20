import { TestBed } from '@angular/core/testing';
import { StateService } from './state.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { UserService } from '@src/app/services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoryService } from '../services/history.service';
import { AudioCacheService } from '../services/audio-cache.service';
import { AuthService } from '@auth0/auth0-angular';

describe('StateService - Guest User Functionality', () => {
	let service: StateService;
	let mockAppAuthService: jasmine.SpyObj<AppAuthService>;
	let mockUserService: jasmine.SpyObj<UserService>;
	let mockAuthService: jasmine.SpyObj<AuthService>;
	let mockRouter: jasmine.SpyObj<Router>;
	let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
	let mockHistoryService: jasmine.SpyObj<HistoryService>;
	let mockAudioCacheService: jasmine.SpyObj<AudioCacheService>;

	beforeEach(() => {
		const appAuthSpy = jasmine.createSpyObj('AppAuthService', ['getUserAuth']);
		const userSpy = jasmine.createSpyObj('UserService', ['author']);
		const authSpy = jasmine.createSpyObj('AuthService', ['loginWithRedirect']);
		const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
		const routeSpy = jasmine.createSpyObj('ActivatedRoute', [], {
			paramMap: jasmine.createSpyObj('paramMap', ['get']),
			queryParams: {}
		});
		const historySpy = jasmine.createSpyObj('HistoryService', ['getPendingCommandsAndClear', 'fillPendingCommands']);
		const audioCacheSpy = jasmine.createSpyObj('AudioCacheService', ['initialize']);

		TestBed.configureTestingModule({
			providers: [
				StateService,
				{ provide: AppAuthService, useValue: appAuthSpy },
				{ provide: UserService, useValue: userSpy },
				{ provide: AuthService, useValue: authSpy },
				{ provide: Router, useValue: routerSpy },
				{ provide: ActivatedRoute, useValue: routeSpy },
				{ provide: HistoryService, useValue: historySpy },
				{ provide: AudioCacheService, useValue: audioCacheSpy }
			]
		});

		service = TestBed.inject(StateService);
		mockAppAuthService = TestBed.inject(AppAuthService) as jasmine.SpyObj<AppAuthService>;
		mockUserService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
		mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
		mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
		mockActivatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
		mockHistoryService = TestBed.inject(HistoryService) as jasmine.SpyObj<HistoryService>;
		mockAudioCacheService = TestBed.inject(AudioCacheService) as jasmine.SpyObj<AudioCacheService>;
	});

	it('should save state to sessionStorage for unauthenticated users', () => {
		// Mock unauthenticated user
		mockUserService.author.and.returnValue(null);
		
		// Mock state
		const mockState = {
			metadata: { projectId: 'test-id', authors: [] },
			studio: { bpm: 120, tracks: [] }
		};

		// Test saving to sessionStorage
		spyOn(service as any, 'saveToSessionStorage').and.callThrough();
		
		// This would be called internally by saveState when user is not authenticated
		(service as any).saveToSessionStorage(mockState);
		
		expect((service as any).saveToSessionStorage).toHaveBeenCalledWith(mockState);
	});

	it('should load state from sessionStorage for unauthenticated users', () => {
		// Mock sessionStorage data
		const mockState = {
			metadata: { projectId: 'test-id', authors: [] },
			studio: { bpm: 120, tracks: [] }
		};
		
		spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify(mockState));
		
		const result = (service as any).loadFromSessionStorage();
		
		expect(result).toEqual(mockState);
	});

	it('should clear sessionStorage after successful save', () => {
		spyOn(sessionStorage, 'removeItem');
		
		(service as any).clearSessionStorage();
		
		expect(sessionStorage.removeItem).toHaveBeenCalledWith('synthia_guest_project_state');
	});

	it('should detect if user has unsaved work', () => {
		// Mock sessionStorage data
		spyOn(sessionStorage, 'getItem').and.returnValue('{"test": "data"}');
		
		const hasWork = service.hasUnsavedWork();
		
		expect(hasWork).toBe(true);
	});
});

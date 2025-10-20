import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { AppAuthService } from './app-auth.service';
import axios from 'axios';

describe('ApiService', () => {
	let service: ApiService;
	let authMock: jasmine.SpyObj<AppAuthService>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj<AppAuthService>('AppAuthService', ['waitForAuthCheck', 'getAuthHeaders']);
    (authMock.waitForAuthCheck as jasmine.Spy).and.returnValue(Promise.resolve());
    (authMock.getAuthHeaders as jasmine.Spy).and.returnValue(Promise.resolve({ Authorization: 'Bearer token' }));

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        { provide: AppAuthService, useValue: authMock },
      ]
    });

    service = TestBed.inject(ApiService);
    
    // Mock axios methods globally for all tests
    spyOn(axios, 'get').and.returnValue(Promise.resolve({ data: {} }) as any);
    spyOn(axios, 'post').and.returnValue(Promise.resolve({ data: {} }) as any);
    spyOn(axios, 'put').and.returnValue(Promise.resolve({ data: {} }) as any);
    spyOn(axios, 'patch').and.returnValue(Promise.resolve({ data: {} }) as any);
    spyOn(axios, 'delete').and.returnValue(Promise.resolve({ data: {} }) as any);
  });

	it('should be created and set static instance', () => {
		expect(service).toBeTruthy();
		expect(ApiService.instance).toBe(service);
	});

  it('callApi should include headers for auth-protected GET', async () => {
    (axios.get as jasmine.Spy).and.returnValue(Promise.resolve({ data: { ok: true } }) as any);
    const res = await service.callApi('/me', 'get', {}, true);
    expect(authMock.waitForAuthCheck).toHaveBeenCalled();
    expect(authMock.getAuthHeaders).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
    expect(res.data).toEqual({ ok: true });
  });

  it('callApi should send body for POST', async () => {
    (axios.post as jasmine.Spy).and.returnValue(Promise.resolve({ data: { success: true } }) as any);
    const res = await service.callApi('/projects/save_new', 'post', { data: { a: 1 } }, true);
    expect(axios.post).toHaveBeenCalled();
    expect(res.data).toEqual({ success: true });
  });

	it('callApi should throw if needAuth and no headers', async () => {
		(authMock.getAuthHeaders as jasmine.Spy).and.returnValue(Promise.resolve(null));
		await expectAsync(service.callApi('/me', 'get', {}, true)).toBeRejected();
	});
});



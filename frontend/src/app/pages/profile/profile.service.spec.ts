import { TestBed } from '@angular/core/testing';
import { ProfileService } from './profile.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { ApiService } from '@src/app/services/api.service';
import { User, ProjectReleased } from '@shared/types';
import axios from 'axios';
import { of } from 'rxjs';
import { createMockUser, createMockProjectReleased, createMockProjectFront, createMockProjectMetadata } from '@src/app/test-helpers/mock-data';

describe('ProfileService', () => {
  let service: ProfileService;
  let authMock: jasmine.SpyObj<AppAuthService>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj('AppAuthService', [
      'getAccessToken', 
      'waitForAuthCheck', 
      'getAuthHeaders', 
      'getUserAuth', 
      'getUserAuth$'
    ]);
    
    // Set up default return values for auth methods
    authMock.waitForAuthCheck.and.returnValue(Promise.resolve());
    authMock.getAuthHeaders.and.returnValue(Promise.resolve({ Authorization: 'Bearer token' }));
    authMock.getUserAuth.and.returnValue({ sub: 'user-123', name: 'Test User' });
    authMock.getUserAuth$.and.returnValue(of({ sub: 'user-123', name: 'Test User' }));

    // Mock ApiService static instance
    const apiMock = {
      routes: {
        getProfile: jasmine.createSpy('getProfile'),
      }
    };
    (ApiService as any)._instance = apiMock;

    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: AppAuthService, useValue: authMock },
      ]
    });

    service = TestBed.inject(ProfileService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.user()).toBeNull();
    expect(service.projects()).toEqual([]);
    expect(service.isDataLoaded).toBeFalse();
  });

  it('should load profile successfully', async () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User',
      profilePictureURL: 'avatar.jpg'
    });
    
    const mockProjects: ProjectReleased[] = [
      createMockProjectReleased({
        front: createMockProjectFront({
          title: 'Test Track',
          dateReleased: new Date('2023-01-01T00:00:00Z'),
          plays: 100,
          likes: 50
        }),
        metadata: createMockProjectMetadata({
          projectId: 'project1',
          title: 'Test Track'
        })
      })
    ];

    const mockResponse = {
      data: {
        user: mockUser,
        projects: mockProjects
      }
    };

    (ApiService as any)._instance.routes.getProfile.and.returnValue(Promise.resolve(mockResponse));

    await service.loadProfile('testuser', new AbortController().signal);

    expect(service.user()).toEqual(mockUser);
    expect(service.projects().length).toBe(1);
    expect(service.projects()[0].front.title).toBe('Test Track');
    expect(service.projects()[0].front.dateReleased).toEqual(new Date('2023-01-01T00:00:00Z'));
    expect(service.isDataLoaded).toBeTrue();
    expect((ApiService as any)._instance.routes.getProfile).toHaveBeenCalledWith(
      { signal: jasmine.any(AbortSignal) },
      'testuser'
    );
  });

  it('should handle empty projects array', async () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User'
    });

    const mockResponse = {
      data: {
        user: mockUser,
        projects: []
      }
    };

    (ApiService as any)._instance.routes.getProfile.and.returnValue(Promise.resolve(mockResponse));

    await service.loadProfile('testuser', new AbortController().signal);

    expect(service.user()).toEqual(mockUser);
    expect(service.projects()).toEqual([]);
    expect(service.isDataLoaded).toBeTrue();
  });

  it('should handle API error', async () => {
    (ApiService as any)._instance.routes.getProfile.and.returnValue(Promise.reject(new Error('API Error')));

    await service.loadProfile('testuser', new AbortController().signal);

    expect(service.user()).toBeNull();
    expect(service.projects()).toEqual([]);
    expect(service.isDataLoaded).toBeTrue();
  });

  it('should handle axios cancel error', async () => {
    const cancelError = new Error('Request cancelled');
    (cancelError as any).code = 'ERR_CANCELED';
    (ApiService as any)._instance.routes.getProfile.and.returnValue(Promise.reject(cancelError));

    await service.loadProfile('testuser', new AbortController().signal);

    expect(service.user()).toBeNull();
    expect(service.projects()).toEqual([]);
    expect(service.isDataLoaded).toBeTrue();
  });

  it('should convert date strings to Date objects', async () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User'
    });
    
    const mockProjects: ProjectReleased[] = [
      createMockProjectReleased({
        front: createMockProjectFront({
          title: 'Test Track',
          dateReleased: new Date('2023-01-01T00:00:00Z'),
          plays: 100,
          likes: 50
        }),
        metadata: createMockProjectMetadata({
          projectId: 'project1',
          title: 'Test Track'
        })
      })
    ];

    const mockResponse = {
      data: {
        user: mockUser,
        projects: mockProjects
      }
    };

    (ApiService as any)._instance.routes.getProfile.and.returnValue(Promise.resolve(mockResponse));

    await service.loadProfile('testuser', new AbortController().signal);

    expect(service.projects()[0].front.dateReleased).toEqual(new Date('2023-01-01T00:00:00Z'));
    expect(service.projects()[0].front.dateReleased instanceof Date).toBeTrue();
  });
});

import { TestBed } from '@angular/core/testing';
import { TrackService } from './track.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { UserService } from '@src/app/services/user.service';
import { AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import { ApiService } from '@src/app/services/api.service';
import { signal } from '@angular/core';
import { ProjectMetadata, ProjectFront, Comment, InteractionState } from '@shared/types';
import axios from 'axios';
import { of } from 'rxjs';
import { createMockProjectMetadata, createMockProjectFront, createMockComment, createMockWaveformData } from '@src/app/test-helpers/mock-data';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';

describe('TrackService', () => {
  let service: TrackService;
  let appAuthMock: jasmine.SpyObj<AppAuthService>;
  let userServiceMock: jasmine.SpyObj<UserService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    appAuthMock = jasmine.createSpyObj('AppAuthService', [
      'getAccessToken', 
      'waitForAuthCheck', 
      'getAuthHeaders', 
      'getUserAuth', 
      'getUserAuth$'
    ]);
    
    // Set up default return values for auth methods
    appAuthMock.waitForAuthCheck.and.returnValue(Promise.resolve());
    appAuthMock.getAuthHeaders.and.returnValue(Promise.resolve({ Authorization: 'Bearer token' }));
    appAuthMock.getUserAuth.and.returnValue({ sub: 'user-123', name: 'Test User' });
    appAuthMock.getUserAuth$.and.returnValue(of({ sub: 'user-123', name: 'Test User' }));
    userServiceMock = jasmine.createSpyObj('UserService', [], {
      user: signal({ profilePictureURL: 'avatar.jpg' })
    });
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    // Mock ApiService static instance
    const apiMock = {
      routes: {
        getTrack: jasmine.createSpy('getTrack'),
        getTrackWaveform: jasmine.createSpy('getTrackWaveform'),
        postComment: jasmine.createSpy('postComment'),
        toggleLike: jasmine.createSpy('toggleLike'),
        recordPlay: jasmine.createSpy('recordPlay'),
      }
    };
    (ApiService as any)._instance = apiMock;

    TestBed.configureTestingModule({
      providers: [
        TrackService,
        { provide: AuthService, useValue: createMockAuth0Client() },
        { provide: AppAuthService, useValue: appAuthMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: Router, useValue: routerMock },
      ]
    });

    service = TestBed.inject(TrackService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.projectId).toBeNull();
    expect(service.projectMetadata()).toBeNull();
    expect(service.projectFront()).toBeNull();
    expect(service.isDataLoaded()).toBeFalse();
    expect(service.waveformData()).toBeNull();
    expect(service.isWaveformLoaded()).toBeFalse();
    expect(service.comments()).toEqual([]);
    expect(service.hasLiked()).toBeFalse();
    expect(service.likes()).toBe(0);
    expect(service.isGuestUser).toBeFalse();
  });

  it('should load track successfully', async () => {
    const mockMetadata: ProjectMetadata = createMockProjectMetadata({ 
      projectId: 'test', 
      title: 'Test Track' 
    });
    const mockFront: ProjectFront = createMockProjectFront({ 
      title: 'Test Track', 
      dateReleased: new Date('2023-01-01T00:00:00Z'),
      likes: 10
    });
    const mockComments: Comment[] = [
      createMockComment({ 
        commentId: '1', 
        content: 'Great track!', 
        createdAt: new Date('2023-01-01T00:00:00Z') 
      })
    ];
    const mockInteractionState: InteractionState = { hasLiked: true };

    const mockResponse = {
      data: {
        metadata: mockMetadata,
        front: mockFront,
        comments: mockComments,
        interactionState: mockInteractionState
      }
    };

    (ApiService as any)._instance.routes.getTrack.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.loadTrack('test-project', new AbortController().signal);

    expect(result).toEqual(mockMetadata);
    expect(service.projectMetadata()).toEqual(mockMetadata);
    expect(service.projectFront()).toEqual(mockFront);
    expect(service.comments().length).toBe(1);
    expect(service.likes()).toBe(10);
    expect(service.hasLiked()).toBeTrue();
    expect(service.isDataLoaded()).toBeTrue();
  });

  it('should handle load track error', async () => {
    (ApiService as any)._instance.routes.getTrack.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadTrack('test-project', new AbortController().signal);

    expect(result).toBeNull();
    expect(service.isDataLoaded()).toBeFalse();
  });

  it('should handle axios cancel error', async () => {
    const cancelError = new Error('Request cancelled');
    (cancelError as any).code = 'ERR_CANCELED';
    (ApiService as any)._instance.routes.getTrack.and.returnValue(Promise.reject(cancelError));

    const result = await service.loadTrack('test-project', new AbortController().signal);

    expect(result).toBeNull();
  });

  it('should load waveform successfully', async () => {
    const mockWaveform = createMockWaveformData({ peaks: new Float32Array([1, 2, 3, 4, 5]) });
    const mockResponse = { data: { waveformData: mockWaveform } };

    (ApiService as any)._instance.routes.getTrackWaveform.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.loadWaveform('test-project', new AbortController().signal);

    expect(result).toEqual(mockWaveform);
    expect(service.waveformData()).toEqual(mockWaveform);
    expect(service.isWaveformLoaded()).toBeTrue();
  });

  it('should handle load waveform error', async () => {
    (ApiService as any)._instance.routes.getTrackWaveform.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadWaveform('test-project', new AbortController().signal);

    expect(result).toBeNull();
    expect(service.isWaveformLoaded()).toBeFalse();
  });

  it('should generate correct stream and download URLs', () => {
    service.projectId = 'test-project';

    expect(service.getStreamUrl()).toBe('http://localhost:5000/api/track/test-project/stream');
    expect(service.getDownloadUrl()).toBe('http://localhost:5000/api/track/test-project/download');
  });

  it('should not leave comment if guest user', async () => {
    service.isGuestUser = true;

    const result = await service.leaveComment('Test comment');

    expect(result).toBeNull();
    expect((ApiService as any)._instance.routes.postComment).not.toHaveBeenCalled();
  });

  it('should not leave comment if empty', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';

    const result = await service.leaveComment('   ');

    expect(result).toBeNull();
    expect((ApiService as any)._instance.routes.postComment).not.toHaveBeenCalled();
  });

  it('should leave comment successfully', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    const mockComment = createMockComment({ 
      commentId: '1', 
      content: 'Test comment', 
      createdAt: new Date('2023-01-01T00:00:00Z') 
    });
    const mockResponse = { data: { newComment: mockComment } };

    (ApiService as any)._instance.routes.postComment.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.leaveComment('Test comment');

    expect(result).toEqual({...mockComment, profilePictureURL: 'avatar.jpg'});
    expect(service.comments().length).toBe(1);
    expect((ApiService as any)._instance.routes.postComment).toHaveBeenCalledWith(
      { data: { comment: 'Test comment', timestamp: jasmine.any(Number) } },
      'test-project'
    );
  });

  it('should handle leave comment error', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    (ApiService as any)._instance.routes.postComment.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.leaveComment('Test comment');

    expect(result).toBeNull();
  });

  it('should not toggle like if guest user', async () => {
    service.isGuestUser = true;

    const result = await service.toggleLike();

    expect(result).toBeTrue();
    expect((ApiService as any)._instance.routes.toggleLike).not.toHaveBeenCalled();
  });

  it('should toggle like successfully (like)', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    service.likes.set(5);
    const mockResponse = { data: { success: true, isLiked: true } };

    (ApiService as any)._instance.routes.toggleLike.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.toggleLike();

    expect(result).toBeTrue();
    expect(service.likes()).toBe(6);
    expect(service.hasLiked()).toBeTrue();
  });

  it('should toggle like successfully (unlike)', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    service.likes.set(5);
    service.hasLiked.set(true);
    const mockResponse = { data: { success: true, isLiked: false } };

    (ApiService as any)._instance.routes.toggleLike.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.toggleLike();

    expect(result).toBeTrue();
    expect(service.likes()).toBe(4);
    expect(service.hasLiked()).toBeFalse();
  });

  it('should handle toggle like error', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    (ApiService as any)._instance.routes.toggleLike.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.toggleLike();

    expect(result).toBeFalse();
  });

  it('should not record play if guest user', async () => {
    service.isGuestUser = true;

    const result = await service.recordPlay();

    expect(result).toBeFalse();
    expect((ApiService as any)._instance.routes.recordPlay).not.toHaveBeenCalled();
  });

  it('should record play successfully', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    const mockResponse = { data: { success: true } };

    (ApiService as any)._instance.routes.recordPlay.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.recordPlay();

    expect(result).toBeTrue();
    expect((ApiService as any)._instance.routes.recordPlay).toHaveBeenCalledWith(
      { data: { timestamp: jasmine.any(Number) } },
      'test-project'
    );
  });

  it('should handle record play error', async () => {
    service.isGuestUser = false;
    service.projectId = 'test-project';
    (ApiService as any)._instance.routes.recordPlay.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.recordPlay();

    expect(result).toBeFalse();
  });
});

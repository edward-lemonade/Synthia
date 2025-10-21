import { TestBed } from '@angular/core/testing';
import { DiscoverService, ListMode } from './discover.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { ApiService } from '@src/app/services/api.service';
import axios from 'axios';
import { of } from 'rxjs';
import { createMockProjectReleased, createMockProjectMetadata, createMockProjectFront } from '@src/app/test-helpers/mock-data';

describe('DiscoverService', () => {
  let service: DiscoverService;
  let authMock: jasmine.SpyObj<AppAuthService>;
  let routerMock: jasmine.SpyObj<Router>;

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
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    // Mock ApiService static instance
    const apiMock = {
      routes: {
        getNewestTracks: jasmine.createSpy('getNewestTracks'),
        getHottestTracks: jasmine.createSpy('getHottestTracks'),
        search: jasmine.createSpy('search'),
      }
    };
    (ApiService as any)._instance = apiMock;

    TestBed.configureTestingModule({
      providers: [
        DiscoverService,
        { provide: AppAuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ]
    });

    service = TestBed.inject(DiscoverService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.listMode()).toBe(0); // ListMode.New
    expect(service.isLoadingMore()).toBeFalse();
    expect(service.projectsAndUsers()).toEqual([]);
    expect(service.searchTerm()).toBe('');
    expect(service.reachedEnd).toBeFalse();
  });

  it('should set list mode to New', () => {
    service.listMode.set(ListMode.New);
    expect(service.listMode()).toBe(ListMode.New);
  });

  it('should set list mode to Hot', () => {
    service.listMode.set(ListMode.Hot);
    expect(service.listMode()).toBe(ListMode.Hot);
  });

  it('should set list mode to Search', () => {
    service.listMode.set(ListMode.Search);
    expect(service.listMode()).toBe(ListMode.Search);
  });

  it('should update search term', () => {
    service.searchTerm.set('test search');
    expect(service.searchTerm()).toBe('test search');
  });

  it('should get last item from projects and users', () => {
    const mockItems = [
      { 
        _itemType: 'track', 
        metadata: createMockProjectMetadata({ projectId: '1' }),
        front: createMockProjectFront({ projectId: '1' })
      },
      { _itemType: 'user', userId: '2' }
    ];
    service.projectsAndUsers.set(mockItems);
    
    expect(service.getLast()).toEqual(mockItems[1]);
  });

  it('should return undefined when no items', () => {
    service.projectsAndUsers.set([]);
    expect(service.getLast()).toBeUndefined();
  });

  it('should load newest tracks when in New mode', async () => {
    const mockProjects = [createMockProjectReleased({ metadata: createMockProjectMetadata({ projectId: '1' }) })];
    const mockResponse = {
      data: {
        projects: mockProjects,
        reachedEnd: false
      }
    };
    (ApiService as any)._instance.routes.getNewestTracks.and.returnValue(Promise.resolve(mockResponse));
    
    service.listMode.set(ListMode.New);
    const result = await service.getMoreItems(true, new AbortController().signal);
    
    expect(result).toEqual(mockResponse.data.projects);
    expect(service.projectsAndUsers()).toEqual(mockResponse.data.projects);
    expect(service.reachedEnd).toBeFalse();
  });

  it('should load hottest tracks when in Hot mode', async () => {
    const mockProjects = [createMockProjectReleased({ metadata: createMockProjectMetadata({ projectId: '1' }) })];
    const mockResponse = {
      data: {
        projects: mockProjects,
        reachedEnd: false,
        lastHotness: 100
      }
    };
    (ApiService as any)._instance.routes.getHottestTracks.and.returnValue(Promise.resolve(mockResponse));
    
    service.listMode.set(ListMode.Hot);
    const result = await service.getMoreItems(true, new AbortController().signal);
    
    expect(result).toEqual(mockResponse.data.projects);
    expect(service.lastHotness).toBe(100);
  });

  it('should search when in Search mode', async () => {
    const mockResults = [{ 
      _itemType: 'track', 
      metadata: createMockProjectMetadata({ projectId: '1' }),
      front: createMockProjectFront({ projectId: '1' })
    }];
    const mockResponse = {
      data: {
        results: mockResults,
        reachedEnd: false,
        lastScore: 0.8,
        lastProjectId: '1',
        lastUserId: 'user1'
      }
    };
    (ApiService as any)._instance.routes.search.and.returnValue(Promise.resolve(mockResponse));
    
    service.listMode.set(ListMode.Search);
    service.searchTerm.set('test');
    const result = await service.getMoreItems(true, new AbortController().signal);
    
    expect(result).toEqual(mockResponse.data.results);
    expect(service.lastScore).toBe(0.8);
    expect(service.lastProjectId).toBe('1');
    expect(service.lastUserId).toBe('user1');
  });

  it('should append items when not resetting', async () => {
    const existingItems = [createMockProjectReleased({ metadata: createMockProjectMetadata({ projectId: '1' }) })];
    const newItems = [createMockProjectReleased({ metadata: createMockProjectMetadata({ projectId: '2' }) })];
    const mockResponse = {
      data: {
        projects: newItems,
        reachedEnd: true
      }
    };
    
    service.projectsAndUsers.set(existingItems);
    (ApiService as any)._instance.routes.getNewestTracks.and.returnValue(Promise.resolve(mockResponse));
    
    service.listMode.set(ListMode.New);
    await service.getMoreItems(false, new AbortController().signal);
    
    expect(service.projectsAndUsers()).toEqual([...existingItems, ...newItems]);
    expect(service.reachedEnd).toBeTrue();
  });

  it('should handle errors gracefully', async () => {
    (ApiService as any)._instance.routes.getNewestTracks.and.returnValue(Promise.reject(new Error('API Error')));
    
    service.listMode.set(ListMode.New);
    const result = await service.getMoreItems(true, new AbortController().signal);
    
    expect(result).toBeNull();
  });

  it('should handle axios cancel errors', async () => {
    const cancelError = new Error('Request cancelled');
    (cancelError as any).code = 'ERR_CANCELED';
    (ApiService as any)._instance.routes.getNewestTracks.and.returnValue(Promise.reject(cancelError));
    
    service.listMode.set(ListMode.New);
    const result = await service.getMoreItems(true, new AbortController().signal);
    
    expect(result).toBeNull();
  });
});

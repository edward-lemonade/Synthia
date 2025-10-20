import { TestBed } from '@angular/core/testing';
import { PublishService } from './publish.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { ApiService } from '@src/app/services/api.service';
import { ProjectMetadata, ProjectFront } from '@shared/types';
import { of } from 'rxjs';
import { createMockProjectMetadata, createMockProjectFront } from '@src/app/test-helpers/mock-data';
import { AuthService } from '@auth0/auth0-angular';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';

describe('PublishService', () => {
  let service: PublishService;
  let authMock: jasmine.SpyObj<AppAuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authMock = jasmine.createSpyObj('AppAuthService', [
      'getAccessToken', 
      'getUserAuth',
      'waitForAuthCheck', 
      'getAuthHeaders', 
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
        getMyProject: jasmine.createSpy('getMyProject'),
        getMyProjectExport: jasmine.createSpy('getMyProjectExport'),
        getMyProjectWaveform: jasmine.createSpy('getMyProjectWaveform'),
        getMyProjectFront: jasmine.createSpy('getMyProjectFront'),
        renameProject: jasmine.createSpy('renameProject'),
        renameProjectFront: jasmine.createSpy('renameProjectFront'),
        publishProject: jasmine.createSpy('publishProject'),
        unpublishProject: jasmine.createSpy('unpublishProject'),
      }
    };
    (ApiService as any)._instance = apiMock;

    TestBed.configureTestingModule({
      providers: [
        PublishService,
        { provide: AppAuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ]
    });

    service = TestBed.inject(PublishService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should load project successfully', async () => {
    const mockProject: ProjectMetadata = createMockProjectMetadata({
      projectId: 'test-project',
      title: 'Test Project',
      isReleased: false
    });

    const mockResponse = { data: { project: mockProject } };
    (ApiService as any)._instance.routes.getMyProject.and.returnValue(Promise.resolve(mockResponse));
    (ApiService as any)._instance.routes.getMyProjectExport.and.returnValue(Promise.resolve({ 
      data: { 
        fileId: 'export-1', 
        arrayBuffer: new ArrayBuffer(8), 
        blob: new Blob(['test']) 
      } 
    }));
    (ApiService as any)._instance.routes.getMyProjectWaveform.and.returnValue(Promise.resolve({ data: { waveformData: {} } }));

    const result = await service.loadProject('test-project', new AbortController().signal);

    expect(result).toEqual(mockProject);
    expect(service.projectMetadata).toEqual(mockProject);
    expect((ApiService as any)._instance.routes.getMyProject).toHaveBeenCalledWith(
      { signal: jasmine.any(AbortSignal) },
      'test-project'
    );
  });

  it('should handle load project error', async () => {
    (ApiService as any)._instance.routes.getMyProject.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadProject('test-project', new AbortController().signal);

    expect(result).toBeNull();
  });

  it('should load export successfully', async () => {
    const mockExport = 'export-data';
    const mockWaveform = { waveformData: { peaks: [] } };
    
    (ApiService as any)._instance.routes.getMyProjectExport.and.returnValue(Promise.resolve({ data: mockExport }));
    (ApiService as any)._instance.routes.getMyProjectWaveform.and.returnValue(Promise.resolve({ data: mockWaveform }));

    const result = await service.loadExport('test-project', new AbortController().signal);

    expect(result).toBe(mockExport);
    expect(service.cachedAudioFile).toBeDefined();
  });

  it('should handle load export error', async () => {
    (ApiService as any)._instance.routes.getMyProjectExport.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadExport('test-project', new AbortController().signal);

    expect(result).toBeNull();
  });

  it('should get export with timeout', async () => {
    const mockExport = { 
      fileId: 'export-1', 
      arrayBuffer: new ArrayBuffer(8), 
      blob: new Blob(['test']),
      url: 'blob:test',
      duration: 120,
      waveformData: {
        duration: 120,
        sampleRate: 44100,
        channels: 2,
        peaks: new Float32Array([0, 1, 0, -1])
      }
    };
    service.cachedAudioFile = mockExport;

    const result = await service.getExport(1000);

    expect(result).toBe(mockExport);
  });

  it('should throw timeout error when export not available', async () => {
    service.cachedAudioFile = { 
      fileId: 'test', 
      arrayBuffer: new ArrayBuffer(8), 
      blob: new Blob(['test']),
      url: 'blob:test',
      duration: 120,
      waveformData: {
        duration: 120,
        sampleRate: 44100,
        channels: 2,
        peaks: new Float32Array([0, 1, 0, -1])
      }
    };

    await expectAsync(service.getExport(100)).toBeRejectedWithError('Export for project not available after 100ms timeout');
  });

  it('should load front successfully', async () => {
    const mockFront: ProjectFront = createMockProjectFront({
      title: 'Published Project',
      description: 'Project description'
    });

    service.projectMetadata = createMockProjectMetadata({ projectId: 'test-project' });
    const mockResponse = { data: { projectFront: mockFront } };
    (ApiService as any)._instance.routes.getMyProjectFront.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.loadFront();

    expect(result).toBe('Project description');
    expect(service.projectFront).toEqual(mockFront);
  });

  it('should handle load front error', async () => {
    service.projectMetadata = createMockProjectMetadata({ projectId: 'test-project' });
    (ApiService as any)._instance.routes.getMyProjectFront.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadFront();

    expect(result).toBeNull();
  });

  it('should get existing description', async () => {
    service.projectFront = createMockProjectFront({ description: 'Existing description' });

    const result = await service.getExistingDescription();

    expect(result).toBe('Existing description');
  });

  it('should rename project for released project', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', isReleased: true });
    (ApiService as any)._instance.routes.renameProjectFront.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.renameProject(project, 'New Name');

    expect(result).toBeTrue();
    expect((ApiService as any)._instance.routes.renameProjectFront).toHaveBeenCalledWith(
      { data: { newName: 'New Name' } },
      'test'
    );
  });

  it('should rename project for unreleased project', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', isReleased: false });
    (ApiService as any)._instance.routes.renameProject.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.renameProject(project, 'New Name');

    expect(result).toBeTrue();
    expect((ApiService as any)._instance.routes.renameProject).toHaveBeenCalledWith(
      { data: { newName: 'New Name' } },
      'test'
    );
  });

  it('should handle rename project error', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', isReleased: false });
    (ApiService as any)._instance.routes.renameProject.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.renameProject(project, 'New Name');

    expect(result).toBeFalse();
  });

  it('should publish project successfully', async () => {
    service.projectMetadata = createMockProjectMetadata({ projectId: 'test-project', title: 'Test Project' });
    (ApiService as any)._instance.routes.publishProject.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.publishProject('Test description', 'New Title');

    expect(result).toBeTrue();
    expect(service.projectMetadata.isReleased).toBeTrue();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/track', 'test-project']);
  });

  it('should publish project without title change', async () => {
    service.projectMetadata = { projectId: 'test-project', title: 'Test Project' } as ProjectMetadata;
    (ApiService as any)._instance.routes.publishProject.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.publishProject('Test description');

    expect(result).toBeTrue();
    expect((ApiService as any)._instance.routes.publishProject).toHaveBeenCalledWith(
      { data: { title: undefined, description: 'Test description' } },
      'test-project'
    );
  });

  it('should handle publish project error', async () => {
    service.projectMetadata = { projectId: 'test-project' } as ProjectMetadata;
    (ApiService as any)._instance.routes.publishProject.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.publishProject('Test description');

    expect(result).toBeFalse();
  });

  it('should unpublish project successfully', async () => {
    service.projectMetadata = { projectId: 'test-project', isReleased: true } as ProjectMetadata;
    authMock.getAccessToken.and.returnValue(Promise.resolve('token'));
    authMock.getUserAuth.and.returnValue({ sub: 'user1' } as any);
    (ApiService as any)._instance.routes.unpublishProject.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.unpublishProject();

    expect(result).toBeTrue();
    expect(service.projectMetadata.isReleased).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/projects']);
  });

  it('should not unpublish if no user', async () => {
    service.projectMetadata = { projectId: 'test-project' } as ProjectMetadata;
    authMock.getAccessToken.and.returnValue(Promise.resolve('token'));
    authMock.getUserAuth.and.returnValue(null);

    const result = await service.unpublishProject();

    expect(result).toBeNull();
  });

  it('should handle unpublish project error', async () => {
    service.projectMetadata = { projectId: 'test-project' } as ProjectMetadata;
    authMock.getAccessToken.and.returnValue(Promise.resolve('token'));
    authMock.getUserAuth.and.returnValue({ sub: 'user1' } as any);
    (ApiService as any)._instance.routes.unpublishProject.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.unpublishProject();

    expect(result).toBeFalse();
  });
});

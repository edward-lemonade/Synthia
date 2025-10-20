import { TestBed } from '@angular/core/testing';
import { ProjectsService } from './projects.service';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { ApiService } from '@src/app/services/api.service';
import { ProjectMetadata } from '@shared/types';
import axios from 'axios';
import { of } from 'rxjs';
import { createMockProjectMetadata } from '@src/app/test-helpers/mock-data';

describe('ProjectsService', () => {
  let service: ProjectsService;
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
        getMyProjects: jasmine.createSpy('getMyProjects'),
        getMyProjectExport: jasmine.createSpy('getMyProjectExport'),
        getMyProjectWaveform: jasmine.createSpy('getMyProjectWaveform'),
        deleteStudio: jasmine.createSpy('deleteStudio'),
        renameProject: jasmine.createSpy('renameProject'),
      }
    };
    (ApiService as any)._instance = apiMock;

    TestBed.configureTestingModule({
      providers: [
        ProjectsService,
        { provide: AppAuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ]
    });

    service = TestBed.inject(ProjectsService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty projects list', () => {
    expect(service.projectsList()).toEqual([]);
    expect(service.projectExports).toEqual({});
    expect(service.renamingProjectId()).toBeNull();
  });

  it('should load projects successfully', async () => {
    const mockProjects: ProjectMetadata[] = [
      createMockProjectMetadata({ projectId: '1', title: 'Project 1', updatedAt: new Date('2023-01-01') }),
      createMockProjectMetadata({ projectId: '2', title: 'Project 2', updatedAt: new Date('2023-01-02') })
    ];
    const mockResponse = { data: { projects: mockProjects } };
    
    (ApiService as any)._instance.routes.getMyProjects.and.returnValue(Promise.resolve(mockResponse));
    (ApiService as any)._instance.routes.getMyProjectExport.and.returnValue(Promise.resolve({ 
      data: { 
        fileId: 'export-1', 
        arrayBuffer: new ArrayBuffer(8), 
        blob: new Blob(['test']) 
      } 
    }));
    (ApiService as any)._instance.routes.getMyProjectWaveform.and.returnValue(Promise.resolve({ data: { waveformData: {} } }));

    const result = await service.loadProjects(new AbortController().signal);

    expect(result).toEqual(mockProjects);
    expect(service.projectsList()).toEqual(mockProjects.reverse()); // Should be sorted by date
    expect((ApiService as any)._instance.routes.getMyProjects).toHaveBeenCalledWith({ signal: jasmine.any(AbortSignal) });
  });

  it('should handle empty projects response', async () => {
    const mockResponse = { data: { projects: null } };
    (ApiService as any)._instance.routes.getMyProjects.and.returnValue(Promise.resolve(mockResponse));

    const result = await service.loadProjects(new AbortController().signal);

    expect(result).toBeUndefined();
    expect(service.projectsList()).toEqual([]);
  });

  it('should handle load projects error', async () => {
    (ApiService as any)._instance.routes.getMyProjects.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.loadProjects(new AbortController().signal);

    expect(result).toEqual([]);
  });

  it('should handle axios cancel error', async () => {
    const cancelError = new Error('Request cancelled');
    (cancelError as any).code = 'ERR_CANCELED';
    (ApiService as any)._instance.routes.getMyProjects.and.returnValue(Promise.reject(cancelError));

    const result = await service.loadProjects(new AbortController().signal);

    expect(result).toEqual([]);
  });

  it('should load export for project', async () => {
    const projectId = 'test-project';
    const mockExport = 'export-data';
    const mockWaveform = { waveformData: { peaks: [] } };
    
    (ApiService as any)._instance.routes.getMyProjectExport.and.returnValue(Promise.resolve({ data: mockExport }));
    (ApiService as any)._instance.routes.getMyProjectWaveform.and.returnValue(Promise.resolve({ data: mockWaveform }));

    const result = await service.loadExport(projectId, new AbortController().signal);

    expect(result).toBe(mockExport);
    expect(service.projectExports[projectId]).toBeDefined();
  });

  it('should get export with timeout', async () => {
    const projectId = 'test-project';
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
    service.projectExports[projectId] = mockExport;

    const result = await service.getExport(projectId, 1000);

    expect(result).toBe(mockExport);
  });

  it('should throw timeout error when export not available', async () => {
    const projectId = 'test-project';

    await expectAsync(service.getExport(projectId, 100)).toBeRejectedWithError(`Export for project ${projectId} not available after 100ms timeout`);
  });

  it('should navigate to new project', () => {
    service.newProject();

    expect(routerMock.navigate).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.stringMatching(/^\/studio\/[a-f0-9-]+$/)]),
      { queryParams: { isNew: true } }
    );
  });

  it('should navigate to open project', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    authMock.getAccessToken.and.returnValue(Promise.resolve('token'));

    await service.openProject(project);

    expect(authMock.getAccessToken).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/studio', project.projectId], { queryParams: { isNew: false } });
  });

  it('should not navigate if no token for open project', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    authMock.getAccessToken.and.returnValue(Promise.resolve(''));

    await service.openProject(project);

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to publish project', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    authMock.getAccessToken.and.returnValue(Promise.resolve('token'));

    await service.publishProject(project);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/publish', project.projectId]);
  });

  it('should delete project successfully', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    service.projectsList.set([project]);
    (ApiService as any)._instance.routes.deleteStudio.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.deleteProject(0, project);

    expect(result).toBeTrue();
    expect(service.projectsList()).toEqual([]);
    expect((ApiService as any)._instance.routes.deleteStudio).toHaveBeenCalledWith({}, project.projectId);
  });

  it('should handle delete project error', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    service.projectsList.set([project]);
    (ApiService as any)._instance.routes.deleteStudio.and.returnValue(Promise.reject(new Error('Delete failed')));

    const result = await service.deleteProject(0, project);

    expect(result).toBeFalse();
  });

  it('should start rename mode', () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Test' });
    
    service.startRename(project);

    expect(service.renamingProjectId()).toBe(project.projectId);
  });

  it('should cancel rename mode', () => {
    service.renamingProjectId.set('test-id');
    
    service.cancelRename();

    expect(service.renamingProjectId()).toBeNull();
  });

  it('should rename project successfully', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Old Title' });
    const newName = 'New Title';
    service.projectsList.set([project]);
    (ApiService as any)._instance.routes.renameProject.and.returnValue(Promise.resolve({ data: { success: true } }));

    const result = await service.renameProject(0, project, newName);

    expect(result).toBeTrue();
    expect(service.projectsList()[0].title).toBe(newName);
    expect(service.renamingProjectId()).toBeNull();
  });

  it('should revert rename on server error', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Old Title' });
    const newName = 'New Title';
    service.projectsList.set([project]);
    (ApiService as any)._instance.routes.renameProject.and.returnValue(Promise.resolve({ data: { success: false } }));

    const result = await service.renameProject(0, project, newName);

    expect(result).toBeFalse();
    expect(service.projectsList()[0].title).toBe(project.title); // Reverted
  });

  it('should revert rename on API error', async () => {
    const project: ProjectMetadata = createMockProjectMetadata({ projectId: 'test', title: 'Old Title' });
    const newName = 'New Title';
    service.projectsList.set([project]);
    (ApiService as any)._instance.routes.renameProject.and.returnValue(Promise.reject(new Error('API Error')));

    const result = await service.renameProject(0, project, newName);

    expect(result).toBeFalse();
    expect(service.projectsList()[0].title).toBe(project.title); // Reverted
  });

  it('should check if project is being renamed', () => {
    const projectId = 'test-project';
    
    expect(service.isRenaming(projectId)).toBeFalse();
    
    service.renamingProjectId.set(projectId);
    
    expect(service.isRenaming(projectId)).toBeTrue();
  });
});

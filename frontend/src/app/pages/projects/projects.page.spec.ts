import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectsPage } from './projects.page';
import { ProjectsService } from './projects.service';
import { ProjectMetadata } from '@shared/types';
import { By } from '@angular/platform-browser';
import { createMockProjectMetadata } from '@src/app/test-helpers/mock-data';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';
import { AuthService } from '@auth0/auth0-angular';

describe('ProjectsPage', () => {
  let component: ProjectsPage;
  let fixture: ComponentFixture<ProjectsPage>;
  let projectsServiceMock: jasmine.SpyObj<ProjectsService>;

  beforeEach(async () => {
    projectsServiceMock = jasmine.createSpyObj('ProjectsService', ['loadProjects'], {
      projectsList: jasmine.createSpy().and.returnValue([])
    });

    await TestBed.configureTestingModule({
      imports: [ProjectsPage],
      providers: [
        { provide: ProjectsService, useValue: projectsServiceMock },
		{ provide: AuthService, useValue: createMockAuth0Client() }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadProjects on init', () => {
    component.ngOnInit();
    
    expect(projectsServiceMock.loadProjects).toHaveBeenCalledWith(jasmine.any(AbortSignal));
  });

  it('should return projects list from service', () => {
    const mockProjects: ProjectMetadata[] = [
      createMockProjectMetadata({ projectId: '1', title: 'Project 1' }),
      createMockProjectMetadata({ projectId: '2', title: 'Project 2' })
    ];
    projectsServiceMock.projectsList.and.returnValue(mockProjects);

    const result = component.getProjectsList();

    expect(result).toEqual(mockProjects);
    expect(projectsServiceMock.projectsList).toHaveBeenCalled();
  });

  it('should abort controller on destroy', () => {
    spyOn(component['abortController'], 'abort');
    component.ngOnDestroy();
    
    expect(component['abortController'].abort).toHaveBeenCalled();
  });

  it('should render projects layout component', () => {
    fixture.detectChanges();
    
    const layoutElement = fixture.debugElement.query(By.css('app-projects-layout'));
    expect(layoutElement).toBeTruthy();
  });

  it('should render project list items for each project', () => {
    const mockProjects: ProjectMetadata[] = [
      createMockProjectMetadata({ projectId: '1', title: 'Project 1' }),
      createMockProjectMetadata({ projectId: '2', title: 'Project 2' })
    ];
    projectsServiceMock.projectsList.and.returnValue(mockProjects);
    fixture.detectChanges();
    
    const projectItems = fixture.debugElement.queryAll(By.css('app-projects-list-item'));
    expect(projectItems.length).toBe(2);
  });

  it('should pass correct project and index to list items', () => {
    const mockProjects: ProjectMetadata[] = [
      createMockProjectMetadata({ projectId: '1', title: 'Project 1' }),
      createMockProjectMetadata({ projectId: '2', title: 'Project 2' })
    ];
    projectsServiceMock.projectsList.and.returnValue(mockProjects);
    fixture.detectChanges();
    
    const projectItems = fixture.debugElement.queryAll(By.css('app-projects-list-item'));
    
    expect(projectItems[0].componentInstance.project).toEqual(mockProjects[0]);
    expect(projectItems[0].componentInstance.index).toBe(0);
    expect(projectItems[1].componentInstance.project).toEqual(mockProjects[1]);
    expect(projectItems[1].componentInstance.index).toBe(1);
  });
});

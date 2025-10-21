import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilePage } from './profile.page';
import { ProfileService } from './profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { User, ProjectReleased } from '@shared/types';
import { createMockUser, createMockProjectReleased, createMockProjectFront, createMockProjectMetadata } from '@src/app/test-helpers/mock-data';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';
import { AuthService } from '@auth0/auth0-angular';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let profileServiceMock: jasmine.SpyObj<ProfileService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeMock: any;

  beforeEach(async () => {
    const userSignal = signal(null);
    const projectsSignal = signal([]);
    
    profileServiceMock = jasmine.createSpyObj('ProfileService', ['loadProfile'], {
      user: userSignal,
      projects: projectsSignal,
      isDataLoaded: false
    });
    
    // The signals are already set up in the mock object

    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    routeMock = jasmine.createSpyObj('ActivatedRoute', [], {
      params: { pipe: jasmine.createSpy().and.returnValue({ subscribe: jasmine.createSpy() }) }
    });

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        { provide: ProfileService, useValue: profileServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
		{ provide: AuthService, useValue: createMockAuth0Client() }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show loading spinner when data not loaded', () => {
    profileServiceMock.isDataLoaded = false;
    fixture.detectChanges();

    const loadingSpinner = fixture.debugElement.query(By.css('app-loading-spinner'));
    const container = fixture.debugElement.query(By.css('.container'));

    expect(loadingSpinner).toBeTruthy();
    expect(container).toBeFalsy();
  });

  it('should show profile content when data is loaded and user exists', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User',
      profilePictureURL: 'avatar.jpg',
      bio: 'Test bio'
    });

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.and.returnValue(mockUser);
    profileServiceMock.projects.and.returnValue([]);
    fixture.detectChanges();

    const loadingSpinner = fixture.debugElement.query(By.css('app-loading-spinner'));
    const container = fixture.debugElement.query(By.css('.container'));

    expect(loadingSpinner).toBeFalsy();
    expect(container).toBeTruthy();
  });

  it('should render user profile information', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User',
      profilePictureURL: 'avatar.jpg',
      bio: 'Test bio'
    });

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.and.returnValue(mockUser);
    profileServiceMock.projects.and.returnValue([]);
    fixture.detectChanges();

    const displayName = fixture.debugElement.query(By.css('h2'));
    const bio = fixture.debugElement.query(By.css('.bio-block'));

    expect(displayName.nativeElement.textContent.trim()).toBe('Test User');
    expect(bio.nativeElement.textContent.trim()).toBe('Test bio');
  });

  it('should not show bio when user has no bio', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User',
      profilePictureURL: 'avatar.jpg'
    });

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.and.returnValue(mockUser);
    profileServiceMock.projects.and.returnValue([]);
    fixture.detectChanges();

    const bio = fixture.debugElement.query(By.css('.bio-block'));
    expect(bio).toBeFalsy();
  });

  it('should render released projects', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User'
    });

    const mockProjects: ProjectReleased[] = [
      createMockProjectReleased({
        front: createMockProjectFront({
          title: 'Test Track 1',
          dateReleased: new Date('2023-01-01'),
          plays: 100,
          likes: 50
        }),
        metadata: createMockProjectMetadata({
          projectId: 'project1',
          title: 'Test Track 1'
        })
      }),
      createMockProjectReleased({
        front: createMockProjectFront({
          title: 'Test Track 2',
          dateReleased: new Date('2023-01-02'),
          plays: 200,
          likes: 75
        }),
        metadata: createMockProjectMetadata({
          projectId: 'project2',
          title: 'Test Track 2'
        })
      })
    ];

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.set(mockUser);
    profileServiceMock.projects.set(mockProjects);
    fixture.detectChanges();

    const releasedItems = fixture.debugElement.queryAll(By.css('.released-item'));
    expect(releasedItems.length).toBe(2);

    const firstItem = releasedItems[0];
    const title = firstItem.query(By.css('.released-title'));
    const plays = firstItem.query(By.css('.stat:nth-child(2) span'));
    const likes = firstItem.query(By.css('.stat:nth-child(3) span'));

    expect(title.nativeElement.textContent.trim()).toBe('Test Track 1');
    expect(plays.nativeElement.textContent.trim()).toBe('100');
    expect(likes.nativeElement.textContent.trim()).toBe('50');
  });

  it('should show no releases message when no projects', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User'
    });

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.and.returnValue(mockUser);
    profileServiceMock.projects.and.returnValue([]);
    fixture.detectChanges();

    const noReleased = fixture.debugElement.query(By.css('.no-released'));
    expect(noReleased.nativeElement.textContent.trim()).toBe('No releases yet.');
  });

  it('should call loadProfile on init with displayName from route params', () => {
    const mockParams = { displayName: 'testuser' };
    routeMock.params.pipe.and.returnValue({
      subscribe: jasmine.createSpy().and.callFake((callback) => callback(mockParams))
    });

    component.ngOnInit();

    expect(profileServiceMock.loadProfile).toHaveBeenCalledWith('testuser', jasmine.any(AbortSignal));
  });

  it('should navigate to track page when released item is clicked', () => {
    const projectId = 'test-project';
    
    component.onReleasedItemClick(projectId);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/track', projectId]);
  });

  it('should abort controller on destroy', () => {
    spyOn(component['abortController'], 'abort');
    component.ngOnDestroy();
    
    expect(component['abortController'].abort).toHaveBeenCalled();
  });

  it('should render avatar component with correct props', () => {
    const mockUser: User = createMockUser({
      auth0Id: 'user1',
      displayName: 'Test User',
      profilePictureURL: 'avatar.jpg'
    });

    profileServiceMock.isDataLoaded = true;
    profileServiceMock.user.and.returnValue(mockUser);
    profileServiceMock.projects.and.returnValue([]);
    fixture.detectChanges();

    const avatar = fixture.debugElement.query(By.css('app-avatar'));
    expect(avatar.componentInstance.width).toBe(60);
    expect(avatar.componentInstance.profilePictureURL).toBe('avatar.jpg');
    expect(avatar.componentInstance.altText).toBe('Test User avatar');
  });
});

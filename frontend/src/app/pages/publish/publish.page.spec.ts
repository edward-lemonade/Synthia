import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PublishPage } from './publish.page';
import { PublishService } from './publish.service';
import { ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { ProjectMetadata, ProjectFront } from '@shared/types';
import { createMockProjectMetadata, createMockProjectFront } from '@src/app/test-helpers/mock-data';
import { AuthService } from '@auth0/auth0-angular';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';

describe('PublishPage', () => {
	let component: PublishPage;
	let fixture: ComponentFixture<PublishPage>;
	let publishServiceMock: jasmine.SpyObj<PublishService>;
	let routeMock: any;

	beforeEach(async () => {
		publishServiceMock = jasmine.createSpyObj('PublishService', [
			'loadProject', 'loadFront', 'publishProject', 'unpublishProject'
		], {
			projectMetadata: undefined,
			projectFront: undefined,
			cachedAudioFile: undefined
		});

		routeMock = jasmine.createSpyObj('ActivatedRoute', [], {
			params: { subscribe: jasmine.createSpy() }
		});

		await TestBed.configureTestingModule({
			imports: [PublishPage],
			providers: [
				{ provide: PublishService, useValue: publishServiceMock },
				{ provide: ActivatedRoute, useValue: routeMock },
		{ provide: AuthService, useValue: createMockAuth0Client() }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(PublishPage);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should render publish header', () => {
		fixture.detectChanges();
		
		const header = fixture.debugElement.query(By.css('.header'));
		expect(header.nativeElement.textContent.trim()).toBe('Publish Project');
	});

	it('should render project title input', () => {
		fixture.detectChanges();
		
		const titleField = fixture.debugElement.query(By.css('.title-field input'));
		expect(titleField.nativeElement.placeholder).toBe('Enter project title...');
	});

	it('should render description textarea', () => {
		fixture.detectChanges();
		
		const descriptionField = fixture.debugElement.query(By.css('.description-field textarea'));
		expect(descriptionField.nativeElement.placeholder).toBe('Add a description for your project...');
	});

	it('should show loading state when loading', () => {
		component.isLoading = true;
		fixture.detectChanges();
		
		const loadingSection = fixture.debugElement.query(By.css('.loading-section'));
		expect(loadingSection.nativeElement.textContent.trim()).toBe('Loading project data...');
	});

	it('should show publish button for unreleased project', () => {
		publishServiceMock.projectMetadata = { isReleased: false } as ProjectMetadata;
		component.isLoading = false;
		fixture.detectChanges();
		
		const publishBtn = fixture.debugElement.query(By.css('.publish-button'));
		expect(publishBtn.nativeElement.textContent.trim()).toBe('Publish');
	});

	it('should show published status for released project', () => {
		publishServiceMock.projectMetadata = { isReleased: true } as ProjectMetadata;
		component.isLoading = false;
		fixture.detectChanges();
		
		const publishedStatus = fixture.debugElement.query(By.css('.published-status'));
		const publishedText = fixture.debugElement.query(By.css('.published-text'));
		
		expect(publishedStatus).toBeTruthy();
		expect(publishedText.nativeElement.textContent.trim()).toBe('This project is already published');
	});

	it('should show update and unpublish buttons for released project', () => {
		publishServiceMock.projectMetadata = { isReleased: true } as ProjectMetadata;
		component.isLoading = false;
		fixture.detectChanges();
		
		const updateBtn = fixture.debugElement.query(By.css('.update-button'));
		const unpublishBtn = fixture.debugElement.query(By.css('.unpublish-button'));
		
		expect(updateBtn.nativeElement.textContent.trim()).toBe('Update');
		expect(unpublishBtn.nativeElement.textContent.trim()).toBe('Unpublish');
	});

	it('should load project data on init', async () => {
		const mockProject: ProjectMetadata = { projectId: 'test-project', title: 'Test Project' } as ProjectMetadata;
		publishServiceMock.loadProject.and.returnValue(Promise.resolve(mockProject));
		routeMock.params.subscribe.and.callFake((callback: any) => callback({ projectId: 'test-project' }));

		await component.ngOnInit();

		expect(publishServiceMock.loadProject).toHaveBeenCalledWith('test-project', jasmine.any(AbortSignal));
		expect(component.projectTitle).toBe('Test Project');
	});

	it('should load front data for released project', async () => {
		const mockProject: ProjectMetadata = { projectId: 'test-project', isReleased: true } as ProjectMetadata;
		const mockFront: ProjectFront = { title: 'Published Title', description: 'Published Description' } as ProjectFront;
		
		publishServiceMock.projectMetadata = mockProject;
		publishServiceMock.loadProject.and.returnValue(Promise.resolve(mockProject));
		publishServiceMock.loadFront.and.returnValue(Promise.resolve('Published Description'));
		routeMock.params.subscribe.and.callFake((callback: any) => callback({ projectId: 'test-project' }));

		await component.ngOnInit();

		expect(publishServiceMock.loadFront).toHaveBeenCalled();
		expect(component.description).toBe('Published Description');
	});

	it('should call publishProject on publish', async () => {
		publishServiceMock.publishProject.and.returnValue(Promise.resolve(true));
		component.projectTitle = 'Test Title';
		component.description = 'Test Description';

		await component.onPublish();

		expect(publishServiceMock.publishProject).toHaveBeenCalledWith('Test Description', 'Test Title');
		expect(component.isPublishing).toBeFalse();
	});

	it('should not publish if title is empty', async () => {
		spyOn(window, 'alert');
		component.projectTitle = '';
		component.isPublishing = false;

		await component.onPublish();

		expect(window.alert).toHaveBeenCalledWith('Please enter a project title');
		expect(publishServiceMock.publishProject).not.toHaveBeenCalled();
	});

	it('should not publish if already publishing', async () => {
		component.isPublishing = true;

		await component.onPublish();

		expect(publishServiceMock.publishProject).not.toHaveBeenCalled();
	});

	it('should call publishProject on update', async () => {
		publishServiceMock.publishProject.and.returnValue(Promise.resolve(true));
		component.projectTitle = 'Updated Title';
		component.description = 'Updated Description';

		await component.onUpdate();

		expect(publishServiceMock.publishProject).toHaveBeenCalledWith('Updated Description', 'Updated Title');
	});

	it('should call unpublishProject on unpublish', async () => {
		spyOn(window, 'confirm').and.returnValue(true);
		publishServiceMock.unpublishProject.and.returnValue(Promise.resolve(true));

		await component.onUnpublish();

		expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to unpublish this project? This will permanently delete all of the track\'s statistics');
		expect(publishServiceMock.unpublishProject).toHaveBeenCalled();
	});

	it('should not unpublish if not confirmed', async () => {
		spyOn(window, 'confirm').and.returnValue(false);

		await component.onUnpublish();

		expect(publishServiceMock.unpublishProject).not.toHaveBeenCalled();
	});

	it('should not unpublish if already publishing', async () => {
		component.isPublishing = true;

		await component.onUnpublish();

		expect(publishServiceMock.unpublishProject).not.toHaveBeenCalled();
	});

	it('should get authors string from project metadata', () => {
		publishServiceMock.projectMetadata = {
			authors: [
				{ displayName: 'Author 1' },
				{ displayName: 'Author 2' }
			]
		} as any;

		const result = component.getAuthorsString();

		expect(result).toBe('Author 1, Author 2');
	});

	it('should return empty string if no authors', () => {
		publishServiceMock.projectMetadata = { authors: [] } as any;

		const result = component.getAuthorsString();

		expect(result).toBe('');
	});

	it('should format duration correctly', () => {
		expect(component.formatDuration(125)).toBe('2:05');
		expect(component.formatDuration(60)).toBe('1:00');
		expect(component.formatDuration(30)).toBe('0:30');
		expect(component.formatDuration(0)).toBe('0:00');
	});

	it('should handle invalid duration', () => {
		expect(component.formatDuration(NaN)).toBe('');
		expect(component.formatDuration(0)).toBe('0:00');
	});

	it('should show loading state when publishing', () => {
		component.isPublishing = true;
		fixture.detectChanges();
		
		const publishBtn = fixture.debugElement.query(By.css('.publish-button'));
		expect(publishBtn.nativeElement.textContent.trim()).toBe('Publishing...');
	});

	it('should handle component lifecycle', () => {
		// Component doesn't have ngOnDestroy, so just test basic functionality
		expect(component).toBeTruthy();
	});
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrackPage } from './track.page';
import { TrackService } from './track.service';
import { ActivatedRoute } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';
import { AuthService } from '@auth0/auth0-angular';

	describe('TrackPage', () => {
	let component: TrackPage;
	let fixture: ComponentFixture<TrackPage>;
	let trackServiceMock: jasmine.SpyObj<TrackService>;
	let routeMock: any;

	beforeEach(async () => {
		const isDataLoadedSignal = signal(false);
		
		trackServiceMock = jasmine.createSpyObj('TrackService', ['loadTrack', 'loadWaveform'], {
		isDataLoaded: isDataLoadedSignal
		});

		routeMock = jasmine.createSpyObj('ActivatedRoute', [], {
		paramMap: { pipe: jasmine.createSpy().and.returnValue({ subscribe: jasmine.createSpy() }) }
		});

		await TestBed.configureTestingModule({
		imports: [TrackPage],
		providers: [
			{ provide: TrackService, useValue: trackServiceMock },
			{ provide: ActivatedRoute, useValue: routeMock },
			{ provide: AuthService, useValue: createMockAuth0Client() }
		]
		}).compileComponents();

		fixture = TestBed.createComponent(TrackPage);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should show loading spinner when data not loaded', () => {
		trackServiceMock.isDataLoaded.set(false);
		fixture.detectChanges();

		const loadingSpinner = fixture.debugElement.query(By.css('app-loading-spinner'));
		const container = fixture.debugElement.query(By.css('.container'));

		expect(loadingSpinner).toBeTruthy();
		expect(container).toBeFalsy();
	});

	it('should show main content when data is loaded', () => {
		trackServiceMock.isDataLoaded.set(true);
		fixture.detectChanges();

		const loadingSpinner = fixture.debugElement.query(By.css('app-loading-spinner'));
		const container = fixture.debugElement.query(By.css('.container'));

		expect(loadingSpinner).toBeFalsy();
		expect(container).toBeTruthy();
	});

	it('should render audio and comment sections', () => {
		trackServiceMock.isDataLoaded.set(true);
		fixture.detectChanges();

		const audioSection = fixture.debugElement.query(By.css('app-track-audio'));
		const commentSection = fixture.debugElement.query(By.css('app-track-comment'));

		expect(audioSection).toBeTruthy();
		expect(commentSection).toBeTruthy();
	});

	it('should load track and waveform on init', async () => {
		const mockParamMap = new Map([['trackId', 'test-track']]);
		routeMock.paramMap.pipe.and.returnValue({
		subscribe: jasmine.createSpy().and.callFake((callback: any) => callback(mockParamMap))
		});

		trackServiceMock.loadTrack.and.returnValue(Promise.resolve({} as any));
		trackServiceMock.loadWaveform.and.returnValue(Promise.resolve({} as any));

		await component.ngOnInit();

		expect(trackServiceMock.projectId).toBe('test-track');
		expect(trackServiceMock.loadTrack).toHaveBeenCalledWith('test-track', jasmine.any(AbortSignal));
		expect(trackServiceMock.loadWaveform).toHaveBeenCalledWith('test-track', jasmine.any(AbortSignal));
		expect(component.requestedData).toBeTrue();
	});

	it('should not load data if no trackId', async () => {
		const mockParamMap = new Map();
		routeMock.paramMap.pipe.and.returnValue({
		subscribe: jasmine.createSpy().and.callFake((callback: any) => callback(mockParamMap))
		});

		await component.ngOnInit();

		expect(trackServiceMock.loadTrack).not.toHaveBeenCalled();
		expect(trackServiceMock.loadWaveform).not.toHaveBeenCalled();
		expect(component.requestedData).toBeFalse();
	});

	it('should not load data if already requested', async () => {
		component.requestedData = true;
		const mockParamMap = new Map([['trackId', 'test-track']]);
		routeMock.paramMap.pipe.and.returnValue({
		subscribe: jasmine.createSpy().and.callFake((callback: any) => callback(mockParamMap))
		});

		await component.ngOnInit();

		expect(trackServiceMock.loadTrack).not.toHaveBeenCalled();
		expect(trackServiceMock.loadWaveform).not.toHaveBeenCalled();
	});

	it('should abort controller on destroy', () => {
		spyOn(component['abortController'], 'abort');
		component.ngOnDestroy();
		
		expect(component['abortController'].abort).toHaveBeenCalled();
	});

	it('should set projectId from route params', async () => {
		const mockParamMap = new Map([['trackId', 'test-track']]);
		routeMock.paramMap.pipe.and.returnValue({
		subscribe: jasmine.createSpy().and.callFake((callback: any) => callback(mockParamMap))
		});

		trackServiceMock.loadTrack.and.returnValue(Promise.resolve({} as any));
		trackServiceMock.loadWaveform.and.returnValue(Promise.resolve({} as any));

		await component.ngOnInit();

		expect(component.projectId).toBe('test-track');
	});
	});

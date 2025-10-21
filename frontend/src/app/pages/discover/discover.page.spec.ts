import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiscoverPage } from './discover.page';
import { DiscoverService, ListMode } from './discover.service';
import { ActivatedRoute, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { createMockAuth0Client } from '@src/app/test-helpers/mock-auth0';
import { AuthService } from '@auth0/auth0-angular';

describe('DiscoverPage', () => {
  let component: DiscoverPage;
  let fixture: ComponentFixture<DiscoverPage>;
  let discoverServiceMock: jasmine.SpyObj<DiscoverService>;
  let routerMock: jasmine.SpyObj<Router>;
  let routeMock: any;

  beforeEach(async () => {
    const listModeSignal = signal(ListMode.New);
    const projectsAndUsersSignal = signal([]);
    const isLoadingMoreSignal = signal(false);
    const searchTermSignal = signal('');
    
    discoverServiceMock = jasmine.createSpyObj('DiscoverService', ['getMoreItems'], {
      listMode: listModeSignal,
      projectsAndUsers: projectsAndUsersSignal,
      isLoadingMore: isLoadingMoreSignal,
      reachedEnd: false,
      searchTerm: searchTermSignal
    });
    
    // The signals are already set up in the mock object

    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    routeMock = jasmine.createSpyObj('ActivatedRoute', [], {
      params: { pipe: jasmine.createSpy().and.returnValue({ subscribe: jasmine.createSpy() }) }
    });

    await TestBed.configureTestingModule({
      imports: [DiscoverPage],
      providers: [
        { provide: DiscoverService, useValue: discoverServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock },
		{ provide: AuthService, useValue: createMockAuth0Client() }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with ListMode enum', () => {
    expect(component.ListMode).toBe(ListMode);
  });

  it('should call getMoreItems on init', () => {
    expect(discoverServiceMock.getMoreItems).toHaveBeenCalledWith(false, jasmine.any(AbortSignal));
  });

  it('should render control buttons', () => {
    const newBtn = fixture.debugElement.query(By.css('.control-btn:nth-child(1)'));
    const hotBtn = fixture.debugElement.query(By.css('.control-btn:nth-child(2)'));
    
    expect(newBtn.nativeElement.textContent.trim()).toContain('New');
    expect(hotBtn.nativeElement.textContent.trim()).toContain('Hot');
  });

  it('should render search container', () => {
    const searchContainer = fixture.debugElement.query(By.css('.search-container'));
    const searchInput = fixture.debugElement.query(By.css('.search-input'));
    const searchBtn = fixture.debugElement.query(By.css('.search-btn'));
    
    expect(searchContainer).toBeTruthy();
    expect(searchInput.nativeElement.placeholder).toBe('search...');
    expect(searchBtn.nativeElement.textContent.trim()).toContain('Search');
  });

  it('should call selectNew when New button is clicked', () => {
    spyOn(component, 'selectNew');
    const newBtn = fixture.debugElement.query(By.css('.control-btn:nth-child(1)'));
    newBtn.triggerEventHandler('click', null);
    
    expect(component.selectNew).toHaveBeenCalled();
  });

  it('should call selectHot when Hot button is clicked', () => {
    spyOn(component, 'selectHot');
    const hotBtn = fixture.debugElement.query(By.css('.control-btn:nth-child(2)'));
    hotBtn.triggerEventHandler('click', null);
    
    expect(component.selectHot).toHaveBeenCalled();
  });

  it('should call doSearch when Search button is clicked', () => {
    spyOn(component, 'doSearch');
    const searchBtn = fixture.debugElement.query(By.css('.search-btn'));
    searchBtn.triggerEventHandler('click', null);
    
    expect(component.doSearch).toHaveBeenCalled();
  });

  it('should call loadMoreItems when Load more button is clicked', () => {
    spyOn(component, 'loadMoreItems');
    discoverServiceMock.reachedEnd = false;
    fixture.detectChanges();
    
    const loadBtn = fixture.debugElement.query(By.css('.load-btn'));
    loadBtn.triggerEventHandler('click', null);
    
    expect(component.loadMoreItems).toHaveBeenCalled();
  });

  it('should not show Load more button when reachedEnd is true', () => {
    discoverServiceMock.reachedEnd = true;
    fixture.detectChanges();
    
    const loadBtn = fixture.debugElement.query(By.css('.load-btn'));
    expect(loadBtn).toBeFalsy();
  });

  it('should show loading spinner when isLoadingMore is true', () => {
    discoverServiceMock.isLoadingMore.set(true);
    fixture.detectChanges();
    
    const loadingSpinner = fixture.debugElement.query(By.css('app-loading-spinner'));
    expect(loadingSpinner).toBeTruthy();
  });

  it('should set list mode to New and call getMoreItems in selectNew', () => {
    component.selectNew();
    
    expect(discoverServiceMock.listMode.set).toHaveBeenCalledWith(ListMode.New);
    expect(discoverServiceMock.getMoreItems).toHaveBeenCalledWith(true, jasmine.any(AbortSignal));
  });

  it('should set list mode to Hot and call getMoreItems in selectHot', () => {
    component.selectHot();
    
    expect(discoverServiceMock.listMode.set).toHaveBeenCalledWith(ListMode.Hot);
    expect(discoverServiceMock.getMoreItems).toHaveBeenCalledWith(true, jasmine.any(AbortSignal));
  });

  it('should set list mode to Search and call getMoreItems in doSearch', () => {
    component.doSearch();
    
    expect(discoverServiceMock.listMode.set).toHaveBeenCalledWith(ListMode.Search);
    expect(discoverServiceMock.getMoreItems).toHaveBeenCalledWith(true, jasmine.any(AbortSignal));
  });

  it('should handle loadMoreItems correctly', async () => {
    discoverServiceMock.isLoadingMore.set(false);
    discoverServiceMock.reachedEnd = false;
    discoverServiceMock.getMoreItems.and.returnValue(Promise.resolve([]));
    
    await component.loadMoreItems();
    
    expect(discoverServiceMock.getMoreItems).toHaveBeenCalledWith(false, jasmine.any(AbortSignal));
  });

  it('should not load more items if already loading', async () => {
    discoverServiceMock.isLoadingMore.set(true);
    
    await component.loadMoreItems();
    
    expect(discoverServiceMock.getMoreItems).not.toHaveBeenCalled();
  });

  it('should not load more items if reached end', async () => {
    discoverServiceMock.isLoadingMore.set(false);
    discoverServiceMock.reachedEnd = true;
    
    await component.loadMoreItems();
    
    expect(discoverServiceMock.getMoreItems).not.toHaveBeenCalled();
  });

  it('should abort controller on destroy', () => {
    spyOn(component['abortController'], 'abort');
    component.ngOnDestroy();
    
    expect(component['abortController'].abort).toHaveBeenCalled();
  });
});

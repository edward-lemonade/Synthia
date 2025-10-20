import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomePage } from './home.page';
import { AuthService } from '@auth0/auth0-angular';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let authMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authMock = jasmine.createSpyObj('AuthService', [
      'loginWithRedirect', 
      'logout', 
      'getAccessTokenSilently'
    ], {
      isAuthenticated$: { subscribe: jasmine.createSpy() },
      user$: of({ sub: 'user-123', name: 'Test User' })
    });
    
    // Set up default return values for auth methods
    authMock.getAccessTokenSilently.and.returnValue(of('mock-token'));
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render welcome message and title', () => {
    const welcomeElement = fixture.debugElement.query(By.css('.welcome'));
    const titleElement = fixture.debugElement.query(By.css('.title'));
    
    expect(welcomeElement.nativeElement.textContent.trim()).toBe('Welcome to');
    expect(titleElement.nativeElement.textContent.trim()).toBe('Synthia');
  });

  it('should render motto lines', () => {
    const mottoElement = fixture.debugElement.query(By.css('.motto'));
    const lines = mottoElement.queryAll(By.css('span'));
    
    expect(lines[0].nativeElement.textContent.trim()).toBe('Make music.');
    expect(lines[1].nativeElement.textContent.trim()).toBe('Make friends.');
    expect(lines[2].nativeElement.textContent.trim()).toBe('Make anything.');
  });

  it('should render login and register buttons', () => {
    const loginBtn = fixture.debugElement.query(By.css('.btn-login'));
    const registerBtn = fixture.debugElement.query(By.css('.btn-register'));
    
    expect(loginBtn.nativeElement.textContent.trim()).toBe('Login');
    expect(registerBtn.nativeElement.textContent.trim()).toBe('Register');
  });

  it('should render studio and discover buttons', () => {
    const studioBtn = fixture.debugElement.query(By.css('.btn-studio'));
    const discoverBtn = fixture.debugElement.query(By.css('.btn-discover'));
    
    expect(studioBtn.nativeElement.textContent.trim()).toBe('Enter studio');
    expect(discoverBtn.nativeElement.textContent.trim()).toBe('Explore community');
  });

  it('should call loginWithRedirect when login button is clicked', () => {
    const loginBtn = fixture.debugElement.query(By.css('.btn-login'));
    loginBtn.triggerEventHandler('click', null);
    
    expect(authMock.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: '/projects/all-projects' }
    });
  });

  it('should call loginWithRedirect when register button is clicked', () => {
    const registerBtn = fixture.debugElement.query(By.css('.btn-register'));
    registerBtn.triggerEventHandler('click', null);
    
    expect(authMock.loginWithRedirect).toHaveBeenCalledWith({
      appState: { target: '/projects/all-projects' }
    });
  });

  it('should navigate to discover page when discover button is clicked', () => {
    const discoverBtn = fixture.debugElement.query(By.css('.btn-discover'));
    discoverBtn.triggerEventHandler('click', null);
    
    expect(routerMock.navigate).toHaveBeenCalledWith(['/discover']);
  });

  it('should navigate to studio with new project when studio button is clicked', () => {
    const studioBtn = fixture.debugElement.query(By.css('.btn-studio'));
    studioBtn.triggerEventHandler('click', null);
    
    expect(routerMock.navigate).toHaveBeenCalledWith(
      jasmine.arrayContaining([jasmine.stringMatching(/^\/studio\/[a-f0-9-]+$/)]),
      { queryParams: { isNew: true } }
    );
  });

  it('should render particles', () => {
    const particles = fixture.debugElement.queryAll(By.css('.particle'));
    expect(particles.length).toBe(12);
  });

  it('should render description text', () => {
    const descElement = fixture.debugElement.query(By.css('.desc'));
    expect(descElement.nativeElement.textContent.trim()).toContain('A digital audio workstation and social platform');
  });
});

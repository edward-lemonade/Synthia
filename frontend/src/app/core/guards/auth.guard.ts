import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

// This guard blocks pages from UNAUTHENTICATED users
// Will redirect to the home page if not authenticated

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
	constructor(private auth: AuthService, private router: Router) {}

	canActivate(): Observable<boolean> {
		return this.auth.isAuthenticated$.pipe(
			tap(auth => !auth && this.router.navigate(['/'])), // library is the landing page if loggedin
			map(auth => auth),
		);
	}
}
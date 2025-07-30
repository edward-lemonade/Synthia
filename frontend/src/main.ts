import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideAuth0 } from '@auth0/auth0-angular';

import { env } from './env/environment';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

if (env.production) {
	console.log('Running in production mode');
} else {
	console.log('Running in development mode');
}

const providers = [
	provideRouter(routes),
	provideZoneChangeDetection({ eventCoalescing: true }),
	provideAnimations(),
	provideAuth0({
		domain: env.auth0_domain,
		clientId: env.auth0_client,
		authorizationParams: {
			redirect_uri: window.location.origin,
			audience: env.auth0_api_aud,
    		scope: 'openid profile email offline_access',
		},
		cacheLocation: 'localstorage', // or 'memory' for better security in production
      	useRefreshTokens: true,
	})
];


bootstrapApplication(AppComponent, { providers })
	.catch((err) => console.error(err));
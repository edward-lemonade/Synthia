import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideHttpClient } from '@angular/common/http';


import { routes } from './app.routes';
import { env } from '../env/environment';
import { provideStore } from '@ngrx/store';

export const appConfig: ApplicationConfig = {
	providers: [
    	provideRouter(routes),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideAnimations(),
		provideHttpClient(),
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
		}),
		provideStore()
	]
}
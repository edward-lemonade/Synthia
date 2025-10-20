import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideAuth0 } from '@auth0/auth0-angular';
import { provideHttpClient } from '@angular/common/http';


import { routes } from './app.routes';
import { environment } from '../environments/environment.dev';
import { AuthCallbackService } from './services/auth-callback.service';

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes, withPreloading(PreloadAllModules)),
		provideZoneChangeDetection({ eventCoalescing: true }),
		provideAnimations(),
		provideHttpClient(),
		provideAuth0({
			domain: environment.AUTH0_DOMAIN,
			clientId: environment.AUTH0_CLIENT,
			authorizationParams: {
				redirect_uri: window.location.origin,
				audience: environment.AUTH0_API_AUD,
				scope: 'openid profile email offline_access',
			},
			cacheLocation: 'localstorage', // or 'memory' for better security in production
			useRefreshTokens: true,
		}),
		AuthCallbackService,
	]
}
import { bootstrapApplication } from '@angular/platform-browser';

import { env } from './env/environment';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

if (env.production) {
	console.log('Running in production mode');
} else {
	console.log('Running in development mode');
}

bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
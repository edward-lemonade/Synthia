import { bootstrapApplication } from '@angular/platform-browser';

import { environment } from './environments/environment.development';

import { enablePatches } from "immer";
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

if (environment.PRODUCTION) {
	console.log('Running in production mode');
} else {
	console.log('Running in development mode');
}

enablePatches();

bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
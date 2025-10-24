import { Component } from '@angular/core';

import { NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AppLayoutComponent } from './components/app-layout/app-layout.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: `
		<router-outlet></router-outlet>	
	`,
})
export class AppComponent {
	title = 'Synthia';

	/* Navigation Debugging
	
	constructor(private router: Router) {
		this.router.events.subscribe(event => {
			if (event instanceof NavigationStart) {
			console.log('🔵 Navigation START:', event.url);
			}
			if (event instanceof NavigationEnd) {
			console.log('🟢 Navigation END:', event.url);
			}
			if (event instanceof NavigationError) {
			console.log('🔴 Navigation ERROR:', event.url, event.error);
			}
		});
	}*/
}

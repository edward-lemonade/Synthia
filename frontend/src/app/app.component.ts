import { Component } from '@angular/core';

import { RouterOutlet } from '@angular/router';
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
}

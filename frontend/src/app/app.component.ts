import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppbarLayoutComponent } from './components/appbar-layout/appbar-layout.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet],
	template: `
		<router-outlet></router-outlet>	
	`,
})
export class AppComponent {
	title = 'NoteFlyte';
}

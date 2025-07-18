import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppbarComponent } from './components/appbar/appbar.component';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, AppbarComponent],
	template: `
		<app-appbar></app-appbar>
		<router-outlet></router-outlet>
	`,
})
export class AppComponent {
	title = 'NoteFlyte';
}

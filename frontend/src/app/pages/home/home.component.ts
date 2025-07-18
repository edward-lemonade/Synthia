import { Component } from '@angular/core';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [],
	template: `
		<h1>
			Welcome to NoteFlyte buddy
		</h1>
	`,
	styles: [`
		h1 {
			color: #3f51b5;
		}
	`]
})
export class HomeComponent {}

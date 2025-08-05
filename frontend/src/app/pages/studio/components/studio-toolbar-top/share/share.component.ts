import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'studio-toolbar-top-share',
	imports: [MatIcon],
	template: `
		<button class="toolbar-btn share-btn">
			<mat-icon>people</mat-icon>
			Share
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class ShareComponent {

}

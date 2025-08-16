import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'studio-toolbar-top-publish-btn',
	imports: [MatIcon],
	template: `
		<button class="toolbar-btn publish-btn">
			<mat-icon>cloud_upload</mat-icon>
			Publish
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class PublishButtonComponent {

}

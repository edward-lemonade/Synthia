import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'studio-toolbar-top-save',
	imports: [MatIcon],
	template: `
		<button class="toolbar-btn save-btn">
			<mat-icon>save</mat-icon>
			Save
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class SaveComponent {

}

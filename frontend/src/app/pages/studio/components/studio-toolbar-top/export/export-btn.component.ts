import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
	selector: 'studio-toolbar-top-export-btn',
	imports: [MatIcon],
	template: `
		<button class="toolbar-btn export-btn">
			<mat-icon>file_download</mat-icon>
			Export
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class ExportButtonComponent {

}

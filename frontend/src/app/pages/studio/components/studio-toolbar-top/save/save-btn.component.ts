import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { ProjectState } from '../../../services/project-state.service';

@Component({
	selector: 'studio-toolbar-top-save-btn',
	imports: [MatIcon],
	template: `
		<button 
			class="toolbar-btn save-btn"
			(click)="onClick()">
			<mat-icon>save</mat-icon>
			Save
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class SaveButtonComponent {
	constructor(public projectState: ProjectState) {}

	onClick() {
		this.projectState.saveState();
	}
}

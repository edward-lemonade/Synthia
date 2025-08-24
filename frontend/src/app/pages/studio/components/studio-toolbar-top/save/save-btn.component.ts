import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { StateService } from '../../../state/state.service';

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
	constructor(public stateService: StateService) {}

	onClick() {
		this.stateService.saveState();
	}
}

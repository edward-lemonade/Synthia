import { Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { StateService } from '../../../state/state.service';

@Component({
	selector: 'studio-toolbar-top-publish-btn',
	imports: [MatIcon],
	template: `
		<button class="toolbar-btn publish-btn" (click)="onPublish()">
			<mat-icon>cloud_upload</mat-icon>
			Publish
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class PublishButtonComponent {

	constructor(
		public stateService: StateService,
		public router: Router
	) {}
	
	onPublish() {
		this.stateService.saveState();
		this.router.navigate(['/publish'], { 
			queryParams: { projectId: this.stateService.projectId }
		});
	}
}
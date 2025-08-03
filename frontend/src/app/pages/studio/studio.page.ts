import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { StudioService } from './studio.service';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent],
	providers: [StudioService],
	template: `
		<app-studio-toolbar-top></app-studio-toolbar-top>
		<app-studio-toolbar-details></app-studio-toolbar-details>
	`,
	styles: ``
})
export class StudioPage implements OnInit {
	sessionId: string = '';

	constructor(private route: ActivatedRoute) {}

	ngOnInit() {
		this.route.params.subscribe(params => {
			this.sessionId = params['sessionId'];
			console.log('Studio component loaded with sessionId:', this.sessionId);
		});
	}
}

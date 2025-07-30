import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'app-studio',
	imports: [],
	template: `
		<p>
			studio works! Session ID: {{ sessionId }}
		</p>
	`,
	styles: ``
})
export class StudioComponent implements OnInit {
	sessionId: string = '';

	constructor(private route: ActivatedRoute) {}

	ngOnInit() {
		this.route.params.subscribe(params => {
			this.sessionId = params['sessionId'];
			console.log('Studio component loaded with sessionId:', this.sessionId);
		});
	}
}

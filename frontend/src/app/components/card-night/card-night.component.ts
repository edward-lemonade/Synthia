import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-card-night',
	imports: [CommonModule, MatIconModule],
	template: `
		<ng-content></ng-content>
	`,
	styleUrls: ['./card-night.component.scss']
})
export class CardNightComponent {}

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'app-card-sunset',
	imports: [CommonModule, MatIconModule],
	template: `
		<ng-content></ng-content>
	`,
	styleUrls: ['./card-sunset.component.scss']
})
export class CardSunsetComponent {}

import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { StateService } from '../../../state/state.service';

@Component({
	selector: 'studio-toolbar-top-menu-btn',
	imports: [MatIcon, MatMenuModule],
	template: `
		<button [matMenuTriggerFor]="optionsMenu" class="options-btn">
			<mat-icon>menu</mat-icon>
		</button>

		<mat-menu #optionsMenu="matMenu" [class]="'options-menu'">
			<div class="options-menu-content">
				<button class="options-menu-btn" (click)="saveExit()">
					<mat-icon>save</mat-icon>
					<p>Save and Exit</p>
				</button>
				<button class="options-menu-btn" (click)="save()">
					<mat-icon>save</mat-icon>
					<p>Save</p>
				</button>
				<button class="options-menu-btn" (click)="exit()">
					<mat-icon>logout</mat-icon>
					<p>Exit</p>
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './menu-btn.component.scss'
})
export class MenuButtonComponent {
	constructor(
		public stateService: StateService,
		private router: Router,
	) {}

	save() {
		this.stateService.saveState();
	}

	exit() {
		this.router.navigate(['/projects']);
	}

	async saveExit() {
		const res = await this.stateService.saveState();
		if (res) {
			this.exit();
		}
	}
}

import { Component } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ProjectState } from '../../../services/project-state.service';
import { Router } from '@angular/router';

@Component({
	selector: 'studio-toolbar-top-menu-btn',
	imports: [MatIcon, MatMenuModule, MatDividerModule],
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
		public projectState: ProjectState,
		private router: Router,
	) {}

	save() {
		this.projectState.saveState();
	}

	exit() {
		this.router.navigate(['/projects']);
	}

	async saveExit() {
		const res = await this.projectState.saveState();
		if (res) {
			this.exit();
		}
	}
}

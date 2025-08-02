import { Component } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';

@Component({
	selector: 'studio-toolbar-details-undo',
	imports: [MatButtonModule, MatButtonToggleModule, MatIcon, MatDivider],
	template: `
		<mat-button-toggle-group class='btn-group'>
			<button
				mat-button 
				class="btn">
				<mat-icon>undo</mat-icon>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				mat-button 
				class="btn">
				<mat-icon>redo</mat-icon>
			</button>
		</mat-button-toggle-group>
	`,
	styleUrl: './undo.component.scss'
})
export class UndoComponent {

}

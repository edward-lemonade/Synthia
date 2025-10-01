import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';

import { HistoryService } from '../../../services/history.service';

@Component({
	selector: 'studio-toolbar-details-undo',
	imports: [MatIcon, MatDivider],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='btn-group'>
			<button
				class="btn"
				(click)="historyService.undo()">
				<mat-icon>undo</mat-icon>
			</button>
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn"
				(click)="historyService.redo()">
				<mat-icon>redo</mat-icon>
			</button>
		</div>
	`,
	styleUrl: './undo.component.scss'
})
export class UndoComponent {
	constructor(public historyService: HistoryService) {}
}

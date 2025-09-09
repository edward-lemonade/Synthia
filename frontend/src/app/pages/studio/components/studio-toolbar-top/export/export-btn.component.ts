import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from './export-dialogue/export-dialog.component';
import { TimelineExportService } from '../../../services/timeline-export.service';
import { StateService } from '../../../state/state.service';

@Component({
	selector: 'studio-toolbar-top-export-btn',
	standalone: true,
	imports: [MatIcon],
	template: `
		<button 
			class="toolbar-btn export-btn"
			(click)="onClick()">
			<mat-icon>file_download</mat-icon>
			Export
		</button>
	`,
	styleUrl: '../studio-toolbar-top.component.scss'
})
export class ExportButtonComponent {
	constructor(
		private dialog: MatDialog,
		private exportService: TimelineExportService,
		private stateService: StateService,
	) {}

	onClick() {
		const dialogRef = this.dialog.open(ExportDialogComponent, {
			width: '250px',
		});

		dialogRef.afterClosed().subscribe(result => this.onExport(result));
	}

	async onExport(result: string) {
		console.log('Exporting...');

		let blob: Blob | null = null;
		let fileName = 'export';

		if (result === 'mp3') {
			blob = await this.exportService.exportProjectAsMP3();
			fileName = `${this.stateService.state.metadata.title()}.mp3`;
		} else if (result === 'wav') {
			blob = await this.exportService.exportProjectAsWAV();
			fileName = `${this.stateService.state.metadata.title()}.wav`;
		}

		if (blob) {
			const url = window.URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = fileName; // Suggested filename
			a.style.display = 'none';

			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);

			window.URL.revokeObjectURL(url);
		}
	}

}

import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
	selector: 'app-export-dialog',
	standalone: true,
	imports: [MatButtonModule],
	template: `
		<div class="export-dialog">
			<button class="btn" color="primary" (click)="close('mp3')">
				Save as MP3
			</button>
			<button class="btn" color="accent" (click)="close('wav')">
				Save as WAV
			</button>
		</div>
	`,
	styleUrls: ['./export-dialog.component.scss']
})
export class ExportDialogComponent {
	constructor(private dialogRef: MatDialogRef<ExportDialogComponent>) {}

	close(format: 'mp3' | 'wav') {
		this.dialogRef.close(format);
	}
}

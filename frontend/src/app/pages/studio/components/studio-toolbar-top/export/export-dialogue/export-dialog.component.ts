import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
	selector: 'app-export-dialog',
	standalone: true,
	imports: [MatButtonModule],
	template: `
		<div class="export-dialogue">
			<button mat-raised-button color="primary" (click)="close('mp3')">
				Save as MP3
			</button>
			<button mat-raised-button color="accent" (click)="close('wav')">
				Save as WAV
			</button>
		</div>
	`,
})
export class ExportDialogComponent {
	constructor(private dialogRef: MatDialogRef<ExportDialogComponent>) {}

	close(format: 'mp3' | 'wav') {
		this.dialogRef.close(format);
	}
}

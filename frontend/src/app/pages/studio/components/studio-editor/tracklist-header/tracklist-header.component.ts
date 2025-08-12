import { Component } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
	selector: 'studio-editor-tracklist-header',
	imports: [MatIcon, MatMenuModule, MatButtonModule, MatButtonToggleModule],
	template: `
		<button [matMenuTriggerFor]="addTrackMenu" class="add-track-btn">
			<mat-icon>add</mat-icon>
			<p> Add Track </p>
		</button>
		
		<mat-menu #addTrackMenu="matMenu" [class]="'add-track-menu'">
			<button mat-menu-item>
				<p>Audio File</p>
			</button>
			<button mat-menu-item>
				<p>Microphone</p>
			</button>
			<button mat-menu-item>
				<p>Drums</p>
			</button>
			<button mat-menu-item>
				<p>Synth</p>
			</button>
		</mat-menu>
	`,
	styleUrl: './tracklist-header.component.scss'
})
export class TracklistHeaderComponent {

}

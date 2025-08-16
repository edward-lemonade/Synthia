import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ProjectState } from '../../../services/project-state.service';

@Component({
	selector: 'studio-editor-tracklist-header',
	imports: [MatIcon, MatMenuModule, MatButtonModule, MatButtonToggleModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button [matMenuTriggerFor]="addTrackMenu" class="add-track-btn">
			<mat-icon>add</mat-icon>
			<p> Add Track </p>
		</button>
		
		<mat-menu #addTrackMenu="matMenu" [class]="'add-track-menu'">
			<div class="add-track-menu-content">
				<button class="add-track-menu-btn" (click)="onAddTrack('audio')">
					<p>Audio File</p>
				</button>
				<button class="add-track-menu-btn" (click)="onAddTrack('microphone')">
					<p>Microphone</p>
				</button>
				<button class="add-track-menu-btn" (click)="onAddTrack('drums')">
					<p>Drums</p>
				</button>
				<button class="add-track-menu-btn" (click)="onAddTrack('instrument')">
					<p>Instrument</p>
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './tracklist-header.component.scss'
})
export class TracklistHeaderComponent {
	constructor(
		public projectState: ProjectState
	) {}

	onAddTrack(type: string) {
		this.projectState.tracksState.addTrack(type);
	}
}

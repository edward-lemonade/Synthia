import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { PlaybackService } from '../../../services/playback.service';

@Component({
	selector: 'studio-toolbar-details-playback',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, MatDivider, MatIcon],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-button-toggle-group class='btn-group'>
			<button 
				class="btn back">
				<mat-icon>fast_rewind</mat-icon>
			</button>
			
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn forward">
				<mat-icon>fast_forward</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn play"
				*ngIf="!playbackService.isPlaying()" 
				(click)="playbackService.play()">
				<mat-icon>play_arrow</mat-icon>
			</button>
			<button 
				class="btn pause"
				*ngIf="playbackService.isPlaying()" 
				(click)="playbackService.pause()">
				<mat-icon>pause</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn beginning">
				<mat-icon>skip_previous</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn record">
				<mat-icon style="color: rgb(192, 56, 79)" >circle</mat-icon>
			</button>
		</mat-button-toggle-group>
	`,
	styleUrl: './playback.component.scss'
})
export class PlaybackComponent {
	constructor(
		public playbackService: PlaybackService,
	) {}
}

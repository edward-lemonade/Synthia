import { ChangeDetectionStrategy, Component, ViewChild, ElementRef } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ProjectState } from '../../../services/project-state.service';
import { AudioHandlerService } from '../../../services/audio-handler.service';
import { DEFAULT_REGION, Region, DEFAULT_TRACK, Track } from '@shared/types';
import { ProjectStateTracks } from '../../../services/substates';

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
				<button class="add-track-menu-btn" (click)="onAddAudioTrack()">
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

		<!-- Hidden file input for audio upload -->
		<input #audioFileInput 
			type="file" 
			accept="audio/*" 
			(change)="onAudioFileSelected($event)"
			style="display: none;">
	`,
	styleUrl: './tracklist-header.component.scss'
})
export class TracklistHeaderComponent {
	@ViewChild('audioFileInput', { static: true }) audioFileInput!: ElementRef<HTMLInputElement>;

	declare tracksState: ProjectStateTracks;

	constructor(
		public projectState: ProjectState,
		private audioHandler: AudioHandlerService
	) {
		this.tracksState = projectState.tracksState;
	}

	onAddTrack(type: string) {
		this.projectState.tracksState.addTrackEmpty(type);
	}

	onAddAudioTrack() {
		this.audioFileInput.nativeElement.click();
	}

	async onAudioFileSelected(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		
		if (files && files.length > 0) {
			const file = files[0];
			
			try {
				// Add the audio file to the audio handler
				const audioFile = await this.audioHandler.addAudioFile(file);

				let track: Track = DEFAULT_TRACK;

				track.index = this.tracksState.numTracks();
				track.name = audioFile.name.replace(/\.[^/.]+$/, ""); // Remove file extension
				track.color = this.tracksState.COLORS[track.index % this.tracksState.COLORS.length];
				track.isMidi = false;
				track.files.push(audioFile.id);
				
				let region: Region = DEFAULT_REGION;
				
				region.duration = audioFile.duration;
				region.data = [JSON.stringify({ audioFileId: audioFile.id })];
				region.fileIndex = 0;
				
				this.projectState.tracksState.addTrack(track);
				console.log(`Audio track created with file: ${audioFile.name}`);
				
			} catch (error) {
				console.error('Failed to create audio track:', error);
			}
		}
		
		// Reset the input
		input.value = '';
	}
}

import { ChangeDetectionStrategy, Component, ViewChild, ElementRef } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AudioHandlerService } from '../../../services/audio-handler.service';
import { StateService } from '../../../state/state.service';
import { TracksService } from '../../../services/tracks.service';
import { TrackType, AudioTrackType, MidiTrackType } from '@shared/types';

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
				<button class="add-track-menu-btn" (click)="onAddTrack(AudioTrackType.Audio)">
					<p>Microphone</p>
				</button>
				<button class="add-track-menu-btn" (click)="onAddTrack(MidiTrackType.Drums)">
					<p>Drums</p>
				</button>
				<button class="add-track-menu-btn" (click)="onAddTrack(MidiTrackType.Instrument)">
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

	AudioTrackType = AudioTrackType;
	MidiTrackType = MidiTrackType;

	get tracks() { return this.stateService.state.studio.tracks }

	constructor(
		public stateService: StateService,
		public tracksService: TracksService,
		private audioHandler: AudioHandlerService
	) {}

	onAddTrack(type: TrackType) {
		this.tracksService.addTrack(type);
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
				const trackIndex = this.tracksService.numTracks();

				const trackProps = {
					name: audioFile.name.replace(/\.[^/.]+$/, ""),
					files: [audioFile.id],
				}
				this.tracksService.addTrack(AudioTrackType.Audio, trackProps);
				
				const regionProps = {
					duration: audioFile.duration,
					data: [JSON.stringify({ audioFileId: audioFile.id })],
					fileIndex: 0, // fileIndex is wrong, filler code
				}

				this.tracksService.addAudioRegion(trackIndex, regionProps);
				console.log(`Audio track created with file: ${audioFile.name}`);
				
			} catch (error) {
				console.error('Failed to create audio track:', error);
			}
		}
		
		// Reset the input
		input.value = '';
	}
}

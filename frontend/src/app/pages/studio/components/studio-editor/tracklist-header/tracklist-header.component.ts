import { ChangeDetectionStrategy, Component, ViewChild, ElementRef } from '@angular/core';

import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AudioCacheService } from '../../../services/audio-cache.service';
import { StateService } from '../../../state/state.service';
import { TracksService } from '../../../services/tracks.service';
import { TrackType, AudioTrackType, MidiTrackType, Track, Region, AudioRegion } from '@shared/types';
import { ViewportService } from '../../../services/viewport.service';

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
				<button class="add-track-menu-btn" (click)="onAddTrack(AudioTrackType.Microphone)">
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
		public viewportService: ViewportService,
		public tracksService: TracksService,
		private audioCacheService: AudioCacheService
	) {}

	onAddTrack(type: TrackType) {
		const trackName = 
			type == MidiTrackType.Instrument ? "Instrument" :
			type == MidiTrackType.Drums ? "Drums" :
			type == AudioTrackType.Microphone ? "Mic" : ""
		this.tracksService.addTrack(type, {name: trackName});
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
				this.tracksService.addNewAudioTrack(file);
			} catch (error) {
				console.error('Failed to create audio track:', error);
			}
		}
		
		// Reset the input
		input.value = '';
	}
}

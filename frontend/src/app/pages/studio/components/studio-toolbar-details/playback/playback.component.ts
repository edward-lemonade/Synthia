import { ChangeDetectionStrategy, Component, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { TimelinePlaybackService } from '../../../services/timeline-playback.service';
import { AudioRecordingService, AudioRecording } from '../../../services/audio-recording.service';
import { RegionService } from '../../../services/region.service';
import { RegionSelectService } from '../../../services/region-select.service';
import { AudioCacheService } from '../../../services/audio-cache.service';
import { AudioRegion, RegionType } from '@shared/types';
import { ViewportService } from '../../../services/viewport.service';
import { MatDialog } from '@angular/material/dialog';
import { DeviceSelectorDialog } from './device-selector-dialog/device-selector-dialog.component';

@Component({
	selector: 'studio-toolbar-details-playback',
	standalone: true,
	imports: [
		CommonModule, 
		MatDivider, 
		MatIcon, 
		MatTooltipModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='btn-group'>
			<button 
				class="btn"
				[disabled]="recordingService.isRecording()"
				(click)="playbackService.moveBackward()">
				<mat-icon>fast_rewind</mat-icon>
			</button>
			
			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn"
				[disabled]="recordingService.isRecording()"
				(click)="playbackService.moveForward()">
				<mat-icon>fast_forward</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn"
				[disabled]="recordingService.isRecording()"
				*ngIf="!playbackService.isPlaying()" 
				(click)="playbackService.play()">
				<mat-icon>play_arrow</mat-icon>
			</button>
			<button 
				class="btn"
				[disabled]="recordingService.isRecording()"
				*ngIf="playbackService.isPlaying()" 
				(click)="playbackService.pause()">
				<mat-icon>pause</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn"
				[disabled]="recordingService.isRecording()"
				(click)="playbackService.moveBeginning()">
				<mat-icon>skip_previous</mat-icon>
			</button>

			<mat-divider class="divider" [vertical]="true"></mat-divider>
			<button 
				class="btn record-btn"
				[class.recording]="recordingService.isRecording()"
				[disabled]="recordingService.isProcessing() || recordingDisabled()"
				(click)="toggleRecording()"
				(contextmenu)="$event.preventDefault(); showDeviceSelector()"
				matTooltip="An audio/microphone track must be selected."
				[matTooltipDisabled]="!recordingDisabled()"
 				matTooltipPosition="below">
				<mat-icon 
					[style.color]="recordIconColor()"
					[class.pulsing]="recordingService.isRecording()">
					{{ recordIcon() }}
				</mat-icon>
			</button>
		</div>
	`,
	styleUrl: './playback.component.scss'
})
export class PlaybackComponent implements OnDestroy {
	recordingDisabled = computed(() => 
		!this.recordingService.isSupported() || 
		!this.selectService.selectedTrack() || 
		this.selectService.selectedTrack()!.regionType() != RegionType.Audio
	);

	recordIconColor = computed(() => {
		if (this.recordingService.isProcessing()) return 'rgb(255, 193, 7)';
		if (this.recordingService.isRecording()) return 'rgb(192, 56, 79)';
		else return 'rgb(192, 56, 79)';
	});

	recordIcon = computed(() => {
		if (this.recordingService.isProcessing()) return 'hourglass_empty';
		if (this.recordingService.isRecording()) return 'square';
		return 'circle';
	});

	constructor(
		public playbackService: TimelinePlaybackService,
		public regionService: RegionService,
		public selectService: RegionSelectService,
		public recordingService: AudioRecordingService,
		public audioCacheService: AudioCacheService,
		public viewportService: ViewportService,
		private dialog: MatDialog
	) {}

	ngOnDestroy(): void {
		this.recordingService.destroy();
	}

	async toggleRecording(): Promise<void> {
		if (this.recordingDisabled()) {
			return;
		}

		// Get device selector on first recording attempt
		if (!this.recordingService.hasSelectedDevice()) {
			const deviceSelected = await this.showDeviceSelector();
			if (!deviceSelected) { return; }
		}

		try {
			const recordingData = await this.playbackService.toggleRecording();
			
			if (recordingData) {
				this.handleRecordingComplete(recordingData);
			}
		} catch (error) {
			console.error('Error toggling recording:', error);
		}
	}

	async showDeviceSelector(): Promise<boolean> {
		try {
			const devices = await this.recordingService.loadAvailableDevices();
			
			if (devices.length === 0) {
				alert('No microphones found. Please connect a microphone and try again.');
				return false;
			}

			const dialogRef = this.dialog.open(DeviceSelectorDialog, {
				width: '500px',
				disableClose: true
			});''
			dialogRef.componentInstance.setDevices(devices);

			const selectedDeviceId = await dialogRef.afterClosed().toPromise();

			if (selectedDeviceId) {
				this.recordingService.selectDevice(selectedDeviceId);
				return true;
			}

			return false;
		} catch (error) {
			console.error('Error selecting device:', error);
			alert('Error accessing microphone. Please check your permissions.');
			return false;
		}
	}

	private async handleRecordingComplete(recordingData: AudioRecording) {
		console.log('Recording completed:', {
			duration: recordingData.duration,
			size: recordingData.blob.size,
			type: recordingData.mimeType
		});
		
		const cachedAudioFile = await this.audioCacheService.addAudioFile(
			this.recordingService.recordingToFile(recordingData)
		);

		const durationInMeasures = this.viewportService.timeToPos(cachedAudioFile.duration);
		const regionProps: Partial<AudioRegion> = {
			fileId: cachedAudioFile.fileId,
			start: this.playbackService.playbackPos(),
			duration: durationInMeasures,
			fullStart: 0,
			fullDuration: durationInMeasures,
			audioStartOffset: 0,
			audioEndOffset: cachedAudioFile.duration,
		}
		this.regionService.addAudioRegion(this.recordingService.recordingTrack()!, regionProps);
	}
}
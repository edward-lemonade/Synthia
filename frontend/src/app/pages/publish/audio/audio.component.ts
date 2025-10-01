import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { RouterModule } from '@angular/router';

import { PublishService } from '../publish.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { createWaveformViewport } from '@src/app/utils/render-waveform';
import { CardSunsetComponent } from "@src/app/components/card-sunset/card-sunset.component";

@Component({
	selector: 'app-publish-audio',
	imports: [CommonModule, RouterModule, MatIconModule, FormsModule, CardSunsetComponent],
	template: `
		<app-card-sunset class="audio-player">
			<div class="audio-controls">
				<button 
					class="play-button"
					(click)="onPlayButton()">
					<mat-icon>{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
				</button>
				<div class="duration-display">
					{{ formatDuration(cachedAudioFile ? cachedAudioFile.duration : 0) }}
				</div>
			</div>
			
			<div class="waveform-container">
				<div #waveformWrapper class="waveform-wrapper">
					<canvas #canvas 
						class="waveform-canvas"
						(click)="onWaveformClick($event)">
					</canvas>
					<div class="progress-container">
						<div class="progress-bar" 
							[style.width.%]="progressPercent">
						</div>
					</div>
				</div>
			</div>
		</app-card-sunset>
	`,
	styleUrls: ['./audio.component.scss']
})
export class PublishAudioComponent implements OnDestroy, AfterViewInit {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

	get projectMetadata() { return this.publishService.projectMetadata };
	get cachedAudioFile() { return this.publishService.cachedAudioFile };
	isLoading = false;
	
	isPlaying: boolean = false;
	progressPercent: number = 0;
	private audioElement: HTMLAudioElement | null = null;
	private progressUpdateInterval: any = null;

	constructor(
		private publishService: PublishService
	) {}

	ngAfterViewInit() {
		this.initializeWaveform();
	}
	ngOnDestroy() {
		this.stopAudio();
	}

	private async initializeWaveform() {
		if (!this.canvas || !this.waveformWrapper) return;

		try {
			if (!this.cachedAudioFile) {
				await this.publishService.getExport();
			}
			
			createWaveformViewport(
				this.cachedAudioFile!.waveformData,
				this.canvas.nativeElement,
				0,
				this.cachedAudioFile!.duration,
				0,
				this.waveformWrapper.nativeElement.clientWidth,
			);
		} catch (error) {
			console.error('Failed to initialize waveform:', error);
		}
	}

	// ==================================================================================================
	// Audio Playback Methods

	onPlayButton() {
		if (this.isPlaying) {
			this.pauseAudio();
		} else {
			const resumeTime = this.audioElement?.currentTime || 0;
			this.playAudio(resumeTime);
		}
	}

	private playAudio(startTime: number = 0) {
		if (!this.cachedAudioFile) return;

		this.audioElement = new Audio();
		this.audioElement.src = this.cachedAudioFile.url;
		this.audioElement.currentTime = startTime;
		
		this.audioElement.addEventListener('ended', () => {
			this.isPlaying = false;
			this.progressPercent = 0;
			this.cleanup();
		});

		this.audioElement.addEventListener('error', (error) => {
			console.error('Audio playback error:', error);
			this.isPlaying = false;
			this.progressPercent = 0;
			this.cleanup();
		});

		this.audioElement.addEventListener('loadedmetadata', () => {
			this.startProgressUpdates();
		});

		// Start playback
		this.audioElement.play().then(() => {
			this.isPlaying = true;
		}).catch(error => {
			console.error('Failed to start playback:', error);
			this.isPlaying = false;
			this.cleanup();
		});
	}

	private pauseAudio() {
		if (this.audioElement) {
			this.audioElement.pause();
			this.isPlaying = false;
			this.stopProgressUpdates();
		}
	}

	private stopAudio() {
		if (this.audioElement) {
			this.audioElement.pause();
			this.audioElement.currentTime = 0;
			this.cleanup();
		}
		this.isPlaying = false;
		this.progressPercent = 0;
		this.stopProgressUpdates();
	}

	onWaveformClick(event: MouseEvent) {
		if (!this.cachedAudioFile || !this.canvas) return;

		const rect = this.canvas.nativeElement.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const canvasWidth = rect.width;
		
		const clickPercent = clickX / canvasWidth;
		const targetTime = clickPercent * this.cachedAudioFile.duration;

		if (this.audioElement) {
			this.audioElement.currentTime = Math.max(0, Math.min(targetTime, this.cachedAudioFile.duration));
			this.updateProgress();
		} else {
			this.playAudio(targetTime);
		}
	}

	private cleanup() {
		if (this.audioElement) {			
			// Clean up the audio element
			this.audioElement.src = '';
			this.audioElement = null;
		}
		this.stopProgressUpdates();
	}

	// ==================================================================================================
	// Progress Updates

	private startProgressUpdates() {
		this.stopProgressUpdates(); // Clear any existing interval
		
		this.progressUpdateInterval = setInterval(() => {
			this.updateProgress();
		}, 100); // Update every 100ms
	}

	private stopProgressUpdates() {
		if (this.progressUpdateInterval) {
			clearInterval(this.progressUpdateInterval);
			this.progressUpdateInterval = null;
		}
	}

	private updateProgress() {
		if (this.audioElement && this.cachedAudioFile) {
			const currentTime = this.audioElement.currentTime;
			const duration = this.cachedAudioFile.duration;
			this.progressPercent = (currentTime / duration) * 100;
		}
	}

	formatDuration(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '';
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
}
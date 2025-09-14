import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { createWaveformViewport } from '@src/app/utils/render-waveform';
import * as TimeUtils from '@src/app/utils/time';
import { TrackService } from '../track.service';

@Component({
	selector: 'app-track-audio',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule],
	template: `
		<div class="audio-player">
			<div class="shine"></div>
			<div class="project-metadata">
				<div class="project-name">{{ projectMetadata.title }}</div>
				<div class="project-authors">{{ getAuthorsString() }}</div>
				<div class="project-date">{{ projectFront.dateReleased.toLocaleDateString() }}</div>
			</div>

			<div class="audio-controls">
				<button 
					class="play-button"
					(click)="onPlayButton()">
					<mat-icon>{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
				</button>

				<div class="playback-display">{{ TimeUtils.formatDuration(playbackTime()) }}</div>
				<div class="duration-display">{{ TimeUtils.formatDuration(cachedAudioFile ? cachedAudioFile.duration : 0) }}</div>
			</div>
			
			<div class="waveform-container">
				<div #waveformWrapper class="waveform-wrapper">
					<ng-container *ngIf="!tracksService.isAudioLoaded">
						<div class="loading-content">
							<mat-spinner diameter="30"></mat-spinner>
						</div>
					</ng-container>
					<ng-container *ngIf="tracksService.isAudioLoaded">
						<canvas #canvas 
							class="waveform-canvas"
							(click)="onWaveformClick($event)">
						</canvas>
						<div class="progress-container">
							<div class="progress-bar" 
								[style.width.%]="progressPercent">
							</div>
						</div>
					</ng-container>
				</div>
			</div>

			<div class="description" *ngIf="projectFront.description">
				{{ projectFront.description }}
			</div>

			<div class="controls">
				<button 
					class="control-btn like-btn"
					[class.liked]="tracksService.hasLiked()"
					(click)="onToggleLike()"
					matTooltip="{{ tracksService.hasLiked() ? 'Unlike' : 'Like' }} this track">
					<mat-icon>{{ tracksService.hasLiked() ? 'favorite' : 'favorite_border' }}</mat-icon>
					<span class="control-label">{{ tracksService.likes() }}</span>
				</button>

				<button 
					class="control-btn share-btn"
					(click)="onShare()"
					matTooltip="Share this track">
					<mat-icon>share</mat-icon>
					<span class="control-label">Share</span>
				</button>

				<button 
					class="control-btn download-btn"
					(click)="onDownload()"
					matTooltip="Download this track">
					<mat-icon>download</mat-icon>
					<span class="control-label">Download</span>
				</button>
			</div>
		</div>
	`,
	styleUrls: ['./audio-section.component.scss', '../track.page.scss']
})
export class AudioSectionComponent implements OnInit, AfterViewInit, OnDestroy {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChildren('canvas') canvasQuery!: QueryList<ElementRef<HTMLCanvasElement>>;
	canvas!: ElementRef<HTMLCanvasElement>;

	TimeUtils = TimeUtils;

	projectId: string | null = null;
	get projectMetadata() { return this.tracksService.projectMetadata! };
	get projectFront() { return this.tracksService.projectFront! };

	get cachedAudioFile() { return this.tracksService.cachedAudioFile! };
	get interactionState() { return this.tracksService.interactionState; }
	
	isPlaying: boolean = false;
	private audioElement: HTMLAudioElement | null = null;
	private progressUpdateInterval: any = null;
	private hasRecordedPlay: boolean = false;
	isWaveformInitialized = false;

	progressPercent: number = 0;
	playbackTime = signal(0);

	constructor(
		private route: ActivatedRoute,
		public tracksService: TrackService,
	) {}

	async ngOnInit() {
		this.route.params.subscribe(async params => {
			this.projectId = params['trackId'];
			
			if (this.projectId) {
				await this.tracksService.loadTrack(this.projectId);
				await this.tracksService.loadAudio(this.projectId);
			}
		});
	}

	ngAfterViewInit() {
		this.canvasQuery.changes.subscribe(() => {
			if (this.canvasQuery.length > 0) {
				console.log("canvas")
				this.canvas = this.canvasQuery.first;
				if (this.canvas && this.waveformWrapper && !this.isWaveformInitialized) {this.initializeWaveform();}
			}
		});
	}

	ngOnDestroy() {
		this.stopAudio();
	}

	// ====================================================================
	// Setup waveform

	private async initializeWaveform() {
		try {
			console.log("initing")
			if (!this.cachedAudioFile) {
				await this.tracksService.getAudio();
			}
			
			createWaveformViewport(
				this.cachedAudioFile.waveformData,
				this.canvas.nativeElement,
				0,
				this.cachedAudioFile.duration,
				0,
				this.waveformWrapper.nativeElement.clientWidth,
			);
			this.isWaveformInitialized = true;
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
			// Record play after a few seconds of listening
			setTimeout(() => {
				if (this.isPlaying && !this.hasRecordedPlay) {
					this.tracksService.recordPlay();
					this.hasRecordedPlay = true;
				}
			}, 3000);
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
		if (!this.canvas) return;

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
			this.audioElement.src = '';
			this.audioElement = null;
		}
		this.stopProgressUpdates();
	}

	// ==================================================================================================
	// Progress Updates

	private startProgressUpdates() {
		this.stopProgressUpdates();
		
		this.progressUpdateInterval = setInterval(() => {
			this.updateProgress();
		}, 100);
	}

	private stopProgressUpdates() {
		if (this.progressUpdateInterval) {
			clearInterval(this.progressUpdateInterval);
			this.progressUpdateInterval = null;
		}
	}

	private updateProgress() {
		if (this.audioElement) {
			const currentTime = this.audioElement.currentTime;
			const duration = this.cachedAudioFile.duration;
			this.progressPercent = (currentTime / duration) * 100;

			this.playbackTime.set(currentTime);
		}
	}

	// ==================================================================================================
	// User Interactions

	async onToggleLike() {
		await this.tracksService.toggleLike();
	}

	onShare() {
		if (navigator.share) {
			navigator.share({
				title: this.projectMetadata.title,
				text: `Check out "${this.projectMetadata.title}" by ${this.getAuthorsString()}`,
				url: window.location.href
			}).catch(err => console.log('Share failed:', err));
		} else {
			// Fallback: Copy to clipboard
			navigator.clipboard.writeText(window.location.href).then(() => {
				console.log('Link copied to clipboard');
			});
		}
	}

	onDownload() {
		const link = document.createElement('a');
		link.href = this.cachedAudioFile.url;
		link.download = `${this.projectMetadata.title}.mp3`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// ==================================================================================================
	// Helpers

	getAuthorsString(): string {
		if (!this.projectMetadata.authors || this.projectMetadata.authors.length === 0) {
			return '';
		}
		return this.projectMetadata.authors.map(author => author.username).join(', ');
	}
}
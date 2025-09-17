import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

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
				<div class="project-name">{{ projectFront?.title }}</div>
				<div class="project-authors">
					<ng-container *ngFor="let author of projectMetadata?.authors; let last = last">
						<span class="author" (click)="onAuthorClick(author)">{{ author.displayName }}</span><span *ngIf="!last">, </span>
					</ng-container>
				</div>
				<div class="project-date">{{ projectFront?.dateReleased?.toLocaleDateString() }}</div>
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
					<ng-container *ngIf="!trackService.isAudioLoaded">
						<div class="loading-content">
							<mat-spinner diameter="30"></mat-spinner>
						</div>
					</ng-container>
					<ng-container *ngIf="trackService.isAudioLoaded">
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

			<div class="description" *ngIf="projectFront?.description">
				{{ projectFront?.description }}
			</div>

			<div class="controls">
				<div class="plays plays-text">
					{{projectFront?.plays}} plays
				</div>

				<span class="spacer"></span>
				
				<button 
					class="control-btn"
					[class.liked]="trackService.hasLiked()"
					(click)="onToggleLike()">
					<mat-icon>{{ trackService.hasLiked() ? 'favorite' : 'favorite_border' }}</mat-icon>
					<span class="label-text">{{ trackService.likes() }}</span>
				</button>

				<button 
					class="control-btn"
					(click)="onShare()">
					<mat-icon>share</mat-icon>
					<span class="label-text">Share</span>
				</button>

				<button 
					class="control-btn"
					(click)="onDownload()">
					<mat-icon>download</mat-icon>
					<span class="label-text">Download</span>
				</button>
			</div>
		</div>
	`,
	styleUrls: ['./audio-section.component.scss', '../track.page.scss']
})
export class AudioSectionComponent implements AfterViewInit, OnDestroy {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChildren('canvas') canvasQuery!: QueryList<ElementRef<HTMLCanvasElement>>;
	canvas!: ElementRef<HTMLCanvasElement>;

	TimeUtils = TimeUtils;

	projectId: string | null = null;
	get projectMetadata() { return this.trackService.projectMetadata() };
	get projectFront() { return this.trackService.projectFront() };

	get cachedAudioFile() { return this.trackService.cachedAudioFile()! };
	get interactionState() { return this.trackService.interactionState; }
	
	// Audio state
	isPlaying: boolean = false;
	private audioElement: HTMLAudioElement | null = null;
	private isAudioInitialized = false;
	private hasRecordedPlay: boolean = false;
	isWaveformInitialized = false;

	progressPercent: number = 0;
	playbackTime = signal(0);

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public trackService: TrackService,
	) {}

	ngAfterViewInit() {
		this.canvasQuery.changes.subscribe(() => {
			if (this.canvasQuery.length > 0) {
				this.canvas = this.canvasQuery.first;
				if (this.canvas && this.waveformWrapper && !this.isWaveformInitialized) {
					this.initializeWaveform();
				}
			}
		});
	}

	ngOnDestroy() {
		this.cleanup();
	}

	// ====================================================================
	// Setup waveform

	private async initializeWaveform() {
		try {
			if (!this.cachedAudioFile) {
				await this.trackService.getAudio();
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
	// Audio Initialization

	private initializeAudio() {
		if (this.isAudioInitialized && this.audioElement) return;
		
		this.audioElement = new Audio();
		this.audioElement.src = this.cachedAudioFile.url;
		this.audioElement.preload = 'metadata';
		
		this.audioElement.addEventListener('ended', this.onAudioEnded.bind(this));
		this.audioElement.addEventListener('error', this.onAudioError.bind(this));
		this.audioElement.addEventListener('timeupdate', this.onTimeUpdate.bind(this));
		
		this.isAudioInitialized = true;
	}

	private onAudioEnded() {
		this.isPlaying = false;
		this.progressPercent = 0;
		this.playbackTime.set(0);
		
		if (this.audioElement) {
			this.audioElement.currentTime = 0;
		}
	}

	private onAudioError(error: Event) {
		console.error('Audio playback error:', error);
		this.isPlaying = false;
		this.progressPercent = 0;
		this.playbackTime.set(0);
	}

	private onTimeUpdate() {
		this.updateProgress();
	}

	// ==================================================================================================
	// Audio Playback Methods

	onPlayButton() {
		this.initializeAudio();
		
		if (this.isPlaying) {
			this.pauseAudio();
		} else {
			this.playAudio();
		}
	}

	private playAudio(startTime?: number) {
		if (!this.audioElement) {
			this.initializeAudio();
		}
		
		if (!this.audioElement) return;
		
		if (startTime !== undefined) {
			this.audioElement.currentTime = Math.max(0, Math.min(startTime, this.cachedAudioFile.duration));
		}
		
		this.audioElement.play().then(() => {
			this.isPlaying = true;
			
			setTimeout(() => {
				if (this.isPlaying && !this.hasRecordedPlay) {
					this.trackService.recordPlay();
					this.hasRecordedPlay = true;
				}
			}, 0.4 * this.audioElement!.duration);
			
		}).catch(error => {
			console.error('Failed to start playback:', error);
			this.isPlaying = false;
		});
	}

	private pauseAudio() {
		if (this.audioElement) {
			this.audioElement.pause();
			this.isPlaying = false;
			console.log("pause");
		}
	}

	onWaveformClick(event: MouseEvent) {
		if (!this.canvas) return;

		const rect = this.canvas.nativeElement.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const canvasWidth = rect.width;
		
		const clickPercent = clickX / canvasWidth;
		const targetTime = clickPercent * this.cachedAudioFile.duration;

		this.initializeAudio();
		
		if (this.audioElement) {
			this.audioElement.currentTime = Math.max(0, Math.min(targetTime, this.cachedAudioFile.duration));
			this.updateProgress();
			
			if (this.isPlaying) {
				this.audioElement.play();
			}
		}
	}

	private cleanup() {
		if (this.audioElement) {
			this.audioElement.removeEventListener('ended', this.onAudioEnded);
			this.audioElement.removeEventListener('error', this.onAudioError);
			this.audioElement.removeEventListener('timeupdate', this.onTimeUpdate);
			
			this.audioElement.pause();
			this.audioElement.src = '';
			this.audioElement = null;
		}
		this.isAudioInitialized = false;
		this.isPlaying = false;
	}

	// ==================================================================================================
	// Progress Updates
	
	private updateProgress() {
		if (this.audioElement && !isNaN(this.audioElement.currentTime)) {
			const currentTime = this.audioElement.currentTime;
			const duration = this.cachedAudioFile.duration;
			this.progressPercent = (currentTime / duration) * 100;
			this.playbackTime.set(currentTime);
		}
	}

	// ==================================================================================================
	// User Interactions

	async onToggleLike() {
		await this.trackService.toggleLike();
	}

	onShare() {
		if (navigator.share) {
			navigator.share({
				title: this.projectMetadata!.title,
				text: `Check out "${this.projectMetadata!.title}" by ${this.authorsString()}`,
				url: window.location.href
			}).catch(err => console.log('Share failed:', err));
		} else {
			navigator.clipboard.writeText(window.location.href).then(() => {
				console.log('Link copied to clipboard');
			});
		}
	}

	onDownload() {
		const link = document.createElement('a');
		link.href = this.cachedAudioFile.url;
		link.download = `${this.projectMetadata!.title}.mp3`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	// ==================================================================================================
	// Helpers

	authorsString = computed(() => {
		if (!this.projectMetadata!.authors || this.projectMetadata!.authors.length === 0) {
			return '';
		}
		return this.projectMetadata!.authors.map(author => author.displayName).join(', ');
	})

	onAuthorClick(author: any) {
		this.router.navigate(['/profile', author.displayName]);
	}
}
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal, computed, effect } from '@angular/core';
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
import { UserService } from '@src/app/services/user.service';
import { AuthService } from '@auth0/auth0-angular';
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";
import { ApiService } from '@src/app/services/api.service';

@Component({
	selector: 'app-track-audio',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule, LoadingSpinnerComponent],
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
				<div class="duration-display">{{ TimeUtils.formatDuration(audioDuration()) }}</div>
			</div>
			
			<div class="waveform-container">
				<div #waveformWrapper class="waveform-wrapper">
					<ng-container *ngIf="!trackService.isWaveformLoaded()">
						<div class="loading-content">
							<app-loading-spinner/>
						</div>
					</ng-container>
					<ng-container *ngIf="trackService.isWaveformLoaded()">
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
					[disabled]="!(auth.isAuthenticated$ | async)"
					[class.disabled]="!(auth.isAuthenticated$ | async)"
					[class.liked]="trackService.hasLiked()"
					(click)="onToggleLike()">
					<mat-icon>{{ trackService.hasLiked() ? 'favorite' : 'favorite_border' }}</mat-icon>
					<span class="label-text">{{ trackService.likes() }}</span>
				</button>

				<button 
					class="control-btn"
					[disabled]="!(auth.isAuthenticated$ | async)"
					[class.disabled]="!(auth.isAuthenticated$ | async)"
					(click)="onShare()">
					<mat-icon>share</mat-icon>
					<span class="label-text">Share</span>
				</button>

				<button 
					class="control-btn"
					[disabled]="!(auth.isAuthenticated$ | async) || isDownloading()"
					[class.disabled]="!(auth.isAuthenticated$ | async) || isDownloading()"
					(click)="onDownload()">
					<ng-container *ngIf="!isDownloading()">
						<mat-icon>download</mat-icon>
						<span class="label-text">Download</span>
					</ng-container>
					<ng-container *ngIf="isDownloading()">
						<app-loading-spinner
							[text]='""'
							[diameter]="14"
							[color]="'#000000ff'"
						/>
						
						<span class="label-text">Download</span>
					</ng-container>
				</button>
			</div>

			<!-- Hidden audio element for streaming -->
			<audio #audioPlayer 
				preload="metadata"
				(loadedmetadata)="onLoadedMetadata()"
				(timeupdate)="onTimeUpdate()"
				(ended)="onAudioEnded()"
				(error)="onAudioError($event)"
				style="display: none;">
			</audio>
		</div>
	`,
	styleUrls: ['./audio-section.component.scss', '../track.page.scss']
})
export class AudioSectionComponent implements AfterViewInit, OnDestroy {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
	@ViewChildren('canvas') canvasQuery!: QueryList<ElementRef<HTMLCanvasElement>>;
	canvas!: ElementRef<HTMLCanvasElement>;

	TimeUtils = TimeUtils;

	get projectId() { return this.trackService.projectId };
	get projectMetadata() { return this.trackService.projectMetadata() };
	get projectFront() { return this.trackService.projectFront() };
	get interactionState() { return this.trackService.interactionState };
	
	isDownloading = signal(false);

	// Audio state
	isPlaying: boolean = false;
	private isAudioInitialized = false;
	private hasRecordedPlay: boolean = false;

	public isWaveformRendered = signal(false);

	progressPercent: number = 0;
	playbackTime = signal(0);
	audioDuration = signal(0);

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public trackService: TrackService,
		public auth: AuthService,
		private cdr: ChangeDetectorRef
	) {}

	ngAfterViewInit() {
		this.canvasQuery.changes.subscribe(() => {
			if (this.canvasQuery.length > 0) {
				this.canvas = this.canvasQuery.first;
				if (this.canvas && this.waveformWrapper) {
					this.renderWaveform();
				}
			}
		});
	}

	ngOnDestroy() {
		this.cleanup();
	}

	// ====================================================================
	// Setup waveform

	private async renderWaveform() {
		try {
			const waveformData = this.trackService.waveformData();
			
			if (waveformData && waveformData.duration > 0) {
				createWaveformViewport(
					waveformData,
					this.canvas.nativeElement,
					0,
					waveformData.duration,
					0,
					this.waveformWrapper.nativeElement.clientWidth,
				);
				this.isWaveformRendered.set(true);
			}
		} catch (error) {
			console.error('Failed to initialize waveform:', error);
		}
	}

	// ==================================================================================================
	// Audio initialization and events

	private initializeAudio() {
		if (this.isAudioInitialized || !this.audioPlayer || !this.projectId) return;

		const audio = this.audioPlayer.nativeElement;
		audio.src = this.trackService.getStreamUrl();
		audio.preload = 'metadata';
		
		this.isAudioInitialized = true;
	}

	onLoadedMetadata() {
		const audio = this.audioPlayer?.nativeElement;
		if (audio && !isNaN(audio.duration)) {
			this.audioDuration.set(audio.duration);
			this.cdr.detectChanges();
		}
	}

	onTimeUpdate() {
		const audio = this.audioPlayer?.nativeElement;
		if (audio && !isNaN(audio.currentTime)) {
			const currentTime = audio.currentTime;
			const duration = audio.duration || this.trackService.audioDuration() || 1;
			this.progressPercent = (currentTime / duration) * 100;
			this.playbackTime.set(currentTime);
			this.cdr.detectChanges();
		}
	}

	onAudioEnded() {
		this.isPlaying = false;
		this.progressPercent = 0;
		this.playbackTime.set(0);
		
		const audio = this.audioPlayer?.nativeElement;
		if (audio) {
			audio.currentTime = 0;
		}
		this.cdr.detectChanges();
	}

	onAudioError(error: Event) {
		console.error('Audio playback error:', error);
		this.isPlaying = false;
		this.progressPercent = 0;
		this.playbackTime.set(0);
		this.cdr.detectChanges();
	}

	private cleanup() {
		const audio = this.audioPlayer?.nativeElement;
		if (audio) {
			audio.pause();
			audio.src = '';
		}
		this.isAudioInitialized = false;
		this.isPlaying = false;
	}

	// ==================================================================================================
	// Controls

	onPlayButton() {
		this.initializeAudio();
		
		if (this.isPlaying) {
			this.pauseAudio();
		} else {
			this.playAudio();
		}
	}

	private playAudio(startTime?: number) {
		const audio = this.audioPlayer?.nativeElement;
		if (!audio) {
			this.initializeAudio();
			return;
		}
		
		if (startTime !== undefined) {
			const duration = audio.duration || this.trackService.audioDuration() || 0;
			audio.currentTime = Math.max(0, Math.min(startTime, duration));
		}
		
		audio.play().then(() => {
			this.isPlaying = true;
			this.cdr.detectChanges();
			
			// Record play after 40% of duration
			const duration = audio.duration || this.trackService.audioDuration() || 0;
			if (duration > 0) {
				setTimeout(() => {
					if (this.isPlaying && !this.hasRecordedPlay) {
						this.trackService.recordPlay();
						this.hasRecordedPlay = true;
					}
				}, 0.4 * duration * 1000);
			}
			
		}).catch(error => {
			console.error('Failed to start playback:', error);
			this.isPlaying = false;
			this.cdr.detectChanges();
		});
	}

	private pauseAudio() {
		const audio = this.audioPlayer?.nativeElement;
		if (audio) {
			audio.pause();
			this.isPlaying = false;
			this.cdr.detectChanges();
		}
	}

	onWaveformClick(event: MouseEvent) {
		if (!this.canvas) return;

		const rect = this.canvas.nativeElement.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const canvasWidth = rect.width;
		
		const clickPercent = clickX / canvasWidth;
		
		this.initializeAudio();
		
		const audio = this.audioPlayer?.nativeElement;
		if (audio) {
			const duration = audio.duration || this.trackService.audioDuration() || 0;
			const targetTime = clickPercent * duration;
			
			// Browser handles range request automatically when setting currentTime
			audio.currentTime = Math.max(0, Math.min(targetTime, duration));
			
			if (this.isPlaying) {
				audio.play();
			}
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

	async onDownload() {
		if (!this.projectId) return;
		try {
			this.isDownloading.set(true);
			const response = await ApiService.instance.routes.downloadTrack({responseType: "blob"}, this.projectId);
			this.isDownloading.set(false);

			const fileName = `${this.projectMetadata?.title || 'track'}.mp3`;

			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", fileName);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download failed:", error);
		}
	}

	// ==================================================================================================
	// Helpers

	authorsString = computed(() => {
		if (!this.projectMetadata || !this.projectMetadata.authors || this.projectMetadata.authors.length === 0) {
			return '';
		}
		return this.projectMetadata.authors.map(author => author.displayName).join(', ');
	})

	onAuthorClick(author: any) {
		this.router.navigate(['/profile', author.displayName]);
	}
}
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { PublishService } from './publish.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { createWaveformViewport } from '@src/app/utils/render-waveform';

@Component({
	selector: 'app-publish',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule],
	providers: [PublishService],
	template: `
		<div class="container">
			<div class="publish-container">
				<div class="header">Publish Project</div>
				
				<div class="project-name">{{ projectMetadata ? projectMetadata.title : '' }}</div>
				
				<div class="audio-player">
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
				</div>
				
				<!-- Description Box -->
				<div class="description-section">
					<mat-form-field appearance="outline" class="description-field">
						<mat-label>Description</mat-label>
						<textarea matInput 
							rows="4" 
							placeholder="Add a description for your project..."
							[(ngModel)]="description">
						</textarea>
					</mat-form-field>
				</div>
				
				<!-- Publish form/options -->
				<div class="publish-options">
					<!-- Additional publish options can go here -->
				</div>
				
				<!-- Publish Button -->
				<div class="publish-button-container">
					<button mat-raised-button 
						color="primary" 
						class="publish-button"
						(click)="onPublish()"
						[disabled]="isPublishing">
						<mat-icon>cloud_upload</mat-icon>
						{{ isPublishing ? 'Publishing...' : 'Publish' }}
					</button>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./publish.page.scss']
})
export class PublishPage implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

	projectId: string | null = null;
	get projectMetadata() { return this.publishService.projectMetadata };
	get cachedAudioFile() { return this.publishService.cachedAudioFile };
	isLoading = false;
	
	isPlaying: boolean = false;
	progressPercent: number = 0;
	private audioElement: HTMLAudioElement | null = null;
	private progressUpdateInterval: any = null;

	description: string = '';
	isPublishing: boolean = false;

	constructor(
		private route: ActivatedRoute,
		private publishService: PublishService
	) {}

	async ngOnInit() {
		this.route.params.subscribe(async params => {
			this.projectId = params['projectId'];
			
			if (this.projectId) {
				await this.loadProjectData();
			}
		});
	}

	async ngAfterViewInit() {
		this.initializeWaveform();
	}

	ngOnDestroy() {
		this.stopAudio();
	}

	private async loadProjectData() {
		if (!this.projectId) return;

		this.isLoading = true;
		
		try {
			const project = await this.publishService.loadProject(this.projectId);
			
		} catch (error) {
			console.error('Error loading project data or audio export:', error);
		} finally {
			this.isLoading = false;
		}
	}

	private async initializeWaveform() {
		if (!this.canvas || !this.waveformWrapper) return;

		try {
			if (!this.cachedAudioFile) {
				await this.publishService.getExport(this.projectId!);
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

	// ==================================================================================================
	// Publish Methods

	async onPublish() {
		if (this.isPublishing) return;
		this.isPublishing = true;
		
		await this.publishService.publishProject(this.description)
		this.isPublishing = false;
	}

	// ==================================================================================================
	// Helpers

	getAuthorsString(): string {
		if (!this.projectMetadata?.authors || this.projectMetadata.authors.length === 0) {
			return '';
		}
		return this.projectMetadata.authors.map(author => author.username).join(', ');
	}

	formatDuration(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '';
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
}
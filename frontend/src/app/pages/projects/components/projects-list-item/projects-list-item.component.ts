import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FormsModule } from '@angular/forms';
import { ProjectMetadata } from '@shared/types';
import { ProjectsService } from '../../projects.service';
import { CachedAudioFile } from '@src/app/utils/audio';
import { createWaveformViewport } from '@src/app/utils/render-waveform';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { CardSunsetComponent } from "@src/app/components/card-sunset/card-sunset.component";

@Component({
	selector: 'app-projects-list-item',
	imports: [MatIconModule, MatMenuModule, MatInputModule, FormsModule, DatePipe],
	template: `
		<div class="project-item">		
			@if (projectsService.isRenaming(project.projectId)) {
				<!-- Rename mode -->
				<div class="center">
					<input matInput 
						#renameInput
						class="rename-input"
						[(ngModel)]="tempProjectName"
						[attr.aria-label]="'Rename ' + project.title"
						(keydown.enter)="onSaveRename()"
						(keydown.escape)="onCancelRename()">
				
					<button mat-icon-button 
						class="icon-button"
						[attr.aria-label]="'Save rename for ' + project.title"
						(click)="onSaveRename()">
						<mat-icon>check</mat-icon>
					</button>
					<button mat-icon-button 
						class="icon-button"
						[attr.aria-label]="'Cancel rename for ' + project.title"
						(click)="onCancelRename()">
						<mat-icon>close</mat-icon>
					</button>
				</div>
			} @else {
				<!-- Default mode -->
				<p class="project-title">{{ project.title }}</p>

				<div class="center">
					<button mat-icon-button 
						class="icon-button"
						[attr.aria-label]="isPlaying ? 'Pause ' + project.title : 'Play ' + project.title"
						(click)="onPlayButton()">
						<mat-icon>{{ isPlaying ? 'pause' : 'play_arrow' }}</mat-icon>
					</button>
					<button mat-button 
						class="open-button"
						(click)="onOpenButton()">
						Studio
					</button>

					<div class="spectrogram-container">
						<div #waveformWrapper class="waveform-wrapper">
							<canvas #canvas 
								class="spectrogram-canvas"
								(click)="onWaveformClick($event)">
							</canvas>
							<div class="progress-container">
								<div class="progress-bar" 
									[style.width.%]="progressPercent">
								</div>
							</div>
						</div>
					</div>

					<div class="duration">
						{{ cachedAudioData ? formatDuration(cachedAudioData.duration) : "" }}
					</div>

					<button mat-icon-button 
						class="icon-button"
						[attr.aria-label]="'Settings ' + project.title"
						[matMenuTriggerFor]="extraSettings">
						<mat-icon>more_vert</mat-icon>
					</button>
					<mat-menu #extraSettings="matMenu" class="glass-menu">
						<button mat-menu-item class="glass-menu-btn" (click)="onRenameButton()">
							<mat-icon>edit</mat-icon>
							Rename
						</button>
						<button mat-menu-item class="glass-menu-btn" (click)="onDeleteButton()">
							<mat-icon color="red">delete</mat-icon>
							Delete
						</button>
						<button mat-menu-item class="glass-menu-btn" (click)="onPublishButton()">
							<mat-icon>cloud_upload</mat-icon>
							Publish
						</button>
					</mat-menu>
				</div>

				<p class="project-date">{{ project.updatedAt | date:'short' }}</p>
			}
		</div>
	`,
	styleUrl: './projects-list-item.component.scss'
})
export class ProjectsListItemComponent implements AfterViewInit, OnDestroy {
	@Input() project!: ProjectMetadata;
	@Input() index!: number;
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
	@ViewChild('renameInput') renameInput!: ElementRef<HTMLInputElement>;
	
	tempProjectName: string = '';
	isPlaying: boolean = false;
	progressPercent: number = 0;
	private wasRenaming: boolean = false;
	
	declare cachedAudioData: CachedAudioFile;
	private audioElement: HTMLAudioElement | null = null;
	private progressUpdateInterval: any = null;

	constructor(
		public projectsService: ProjectsService,
		public router: Router,
	) {}

	async ngAfterViewInit() {
		await this.initializeWaveform();
	}

	ngOnDestroy() {
		this.stopAudio();
	}

	ngAfterViewChecked() {
		const isCurrentlyRenaming = this.projectsService.isRenaming(this.project.projectId);
		
		if (this.wasRenaming && !isCurrentlyRenaming) {
			setTimeout(() => this.initializeWaveform());
		}

		this.wasRenaming = isCurrentlyRenaming;

		if (isCurrentlyRenaming && this.renameInput) {
			setTimeout(() => {
				this.renameInput.nativeElement.focus();
			});
		}
	}

	private async initializeWaveform() {
		if (!this.canvas || !this.waveformWrapper) return;
		
		try {
			if (!this.cachedAudioData) {
				this.cachedAudioData = await this.projectsService.getExport(this.project.projectId);
			}
			
			createWaveformViewport(
				this.cachedAudioData.waveformData,
				this.canvas.nativeElement,
				0,
				this.cachedAudioData.duration,
				0,
				this.waveformWrapper.nativeElement.clientWidth,
			);
		} catch (error) {
			console.error('Failed to initialize waveform:', error);
		}
	}

	// ==================================================================================================
	// Play Preview

	onPlayButton() {
		if (this.isPlaying) {
			this.pauseAudio();
		} else {
			const resumeTime = this.audioElement?.currentTime || 0;
			this.playAudio(resumeTime);
		}
	}

	private playAudio(startTime: number = 0) {
		if (!this.cachedAudioData) return;

		this.audioElement = new Audio();
		this.audioElement.src = this.cachedAudioData.url;
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
		if (!this.cachedAudioData || !this.canvas) return;

		const rect = this.canvas.nativeElement.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const canvasWidth = rect.width;
		
		const clickPercent = clickX / canvasWidth;
		const targetTime = clickPercent * this.cachedAudioData.duration;

		if (this.audioElement) {
			this.audioElement.currentTime = Math.max(0, Math.min(targetTime, this.cachedAudioData.duration));
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
		if (this.audioElement && this.cachedAudioData) {
			const currentTime = this.audioElement.currentTime;
			const duration = this.cachedAudioData.duration;
			this.progressPercent = (currentTime / duration) * 100;
		}
	}

	// ==================================================================================================
	// Other Buttons

	onOpenButton() {
		this.stopAudio();
		this.projectsService.openProject(this.project);
	}

	onDeleteButton() {
		this.stopAudio();
		this.projectsService.deleteProject(this.index, this.project);
	}

	onRenameButton() {
		this.tempProjectName = this.project.title;
		this.projectsService.startRename(this.project);
	}

	onCancelRename() {
		this.tempProjectName = '';
		this.projectsService.cancelRename();
	}

	onSaveRename() {
		if (this.tempProjectName.trim() && this.tempProjectName.trim() !== this.project.title) {
			this.projectsService.renameProject(this.index, this.project, this.tempProjectName.trim());
		} else {
			this.projectsService.cancelRename();
		}
		this.tempProjectName = '';
	}

	onPublishButton() {
		this.projectsService.publishProject(this.project)
	}


	// ==================================================================================================
	// Helpers
	
	formatDuration(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '';
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
}
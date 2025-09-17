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
import { PublishAudioComponent } from "./audio/audio.component";

@Component({
	selector: 'app-publish',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, FormsModule, PublishAudioComponent],
	providers: [PublishService],
	template: `
		<div class="container">
			<div class="publish-container">
				<div class="header">Publish Project</div>
				
				<!-- Project Title Input -->
				<div class="title-section">
					<mat-form-field appearance="outline" class="title-field">
						<mat-label>Project Title</mat-label>
						<input matInput 
							placeholder="Enter project title..."
							[(ngModel)]="projectTitle">
					</mat-form-field>
				</div>
				
				<app-publish-audio/>

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
				
				<div class="publish-button-container">
					<!-- Loading state -->
					<div *ngIf="isLoading" class="loading-section">
						<div class="loading-text">Loading project data...</div>
					</div>
					
					<!-- Show different options based on published status -->
					<div *ngIf="!isLoading && !projectMetadata?.isReleased" class="publish-section">
						<button
							class="button publish-button"
							(click)="onPublish()"
							[disabled]="isPublishing">
							<mat-icon>cloud_upload</mat-icon>
							{{ isPublishing ? 'Publishing...' : 'Publish' }}
						</button>
					</div>
					
					<div *ngIf="!isLoading && projectMetadata?.isReleased" class="published-section">
						<div class="published-status">
							<mat-icon class="published-icon">check_circle</mat-icon>
							<span class="published-text">This project is already published</span>
						</div>
						
						<div class="published-actions">
							<button
								class="button update-button"
								(click)="onUpdate()"
								[disabled]="isPublishing">
								<mat-icon>edit</mat-icon>
								{{ isPublishing ? 'Updating...' : 'Update' }}
							</button>
							
							<button
								class="button unpublish-button"
								(click)="onUnpublish()"
								[disabled]="isPublishing">
								<mat-icon>remove_circle</mat-icon>
								{{ isPublishing ? 'Unpublishing...' : 'Unpublish' }}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./publish.page.scss']
})
export class PublishPage implements OnInit {
	@ViewChild('waveformWrapper') waveformWrapper!: ElementRef<HTMLDivElement>;
	@ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

	projectId: string | null = null;
	get projectMetadata() { return this.publishService.projectMetadata };
	get projectFront() { return this.publishService.projectFront };
	get cachedAudioFile() { return this.publishService.cachedAudioFile };
	isLoading = false;

	projectTitle: string = '';
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

	private async loadProjectData() {
		if (!this.projectId) return;

		this.isLoading = true;
		
		try {
			const projectMetadata = await this.publishService.loadProject(this.projectId);
			if (projectMetadata) {
				this.projectTitle = projectMetadata.title || '';
			}
			if (this.projectMetadata?.isReleased) {
				await this.publishService.loadFront();
				this.description = this.projectFront?.description || '';
				this.projectTitle = this.projectFront.title || '';
			}
		} catch (error) {
			console.error('Error loading project data or audio export:', error);
		} finally {
			this.isLoading = false;
		}
	}


	// ==================================================================================================
	// Publish Methods

	async onPublish() {
		if (this.isPublishing) return;

		if (!this.projectTitle.trim()) {
			alert('Please enter a project title');
			return;
		}
		
		this.isPublishing = true;
		
		await this.publishService.publishProject(this.description, this.projectTitle)
		this.isPublishing = false;
	}

	async onUpdate() {
		if (this.isPublishing) return;

		if (!this.projectTitle.trim()) {
			alert('Please enter a project title');
			return;
		}
		
		this.isPublishing = true;
		
		await this.publishService.publishProject(this.description, this.projectTitle)
		this.isPublishing = false;
	}

	async onUnpublish() {
		if (this.isPublishing) return;
		
		const confirmed = confirm('Are you sure you want to unpublish this project? This will permanently delete all of the track\'s statistics');
		if (!confirmed) return;
		
		this.isPublishing = true;
		
		const success = await this.publishService.unpublishProject();
		this.isPublishing = false;
		
		if (success) {
			console.log('Project unpublished successfully');
		}
	}

	// ==================================================================================================
	// Helpers

	getAuthorsString(): string {
		if (!this.projectMetadata?.authors || this.projectMetadata.authors.length === 0) {
			return '';
		}
		return this.projectMetadata.authors.map(author => author.displayName).join(', ');
	}

	formatDuration(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '';
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
}
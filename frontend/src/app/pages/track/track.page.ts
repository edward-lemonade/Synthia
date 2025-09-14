import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { TrackService } from './track.service';
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
import { AudioSectionComponent } from "./audio-section/audio-section.component";
import { CommentSectionComponent } from "./comment-section/comment-section.component";

@Component({
	selector: 'app-track',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule, AudioSectionComponent, CommentSectionComponent],
	providers: [TrackService],
	template: `
		<!-- Loading Screen -->
		<div class="loading-container" *ngIf="!tracksService.isDataLoaded">
			<div class="loading-content">
				<mat-spinner diameter="60"></mat-spinner>
				<p class="loading-text">Loading track...</p>
			</div>
		</div>

		<!-- Main Content -->
		<div class="container" *ngIf="tracksService.isDataLoaded">
			<div class="track-container">

				<app-track-audio/>

				
				<app-track-comment/>
			</div>
		</div>
	`,
	styleUrls: ['./track.page.scss']
})
export class TrackPage {
	projectId: string | null = null;
	
	// Direct property access since we know data is loaded
	get projectMetadata() { return this.tracksService.projectMetadata! };
	get projectFront() { return this.tracksService.projectFront! };
	get cachedAudioFile() { return this.tracksService.cachedAudioFile! };
	get interactionState() { return this.tracksService.interactionState; }

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


}
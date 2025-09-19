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

import { AudioSectionComponent } from "./audio-section/audio-section.component";
import { CommentSectionComponent } from "./comment-section/comment-section.component";
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";
import { take } from 'rxjs';

@Component({
	selector: 'app-track',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule, AudioSectionComponent, CommentSectionComponent, LoadingSpinnerComponent],
	providers: [TrackService],
	standalone: true,
	template: `
		<!-- Loading Screen -->
		<div class="loading-container" *ngIf="!tracksService.isDataLoaded">
			<div class="loading-content">
				<app-loading-spinner/>
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
export class TrackPage implements OnInit, OnDestroy {
	private abortController = new AbortController();
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
		this.route.paramMap
			.pipe(take(1))
			.subscribe(async (params) => {
			const trackId = params.get('trackId');
				if (trackId) {
					this.projectId = trackId;
					await this.tracksService.loadTrack(this.projectId, this.abortController.signal);
					await this.tracksService.loadAudio(this.projectId, this.abortController.signal);
				}
			});
	}
	ngOnDestroy(): void {
		this.abortController.abort();
	}


}
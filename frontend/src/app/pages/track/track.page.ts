import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { TrackService } from './track.service';
import { CommonModule } from '@angular/common';

import { AudioSectionComponent } from "./audio-section/audio-section.component";
import { CommentSectionComponent } from "./comment-section/comment-section.component";
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";
import { take } from 'rxjs';

@Component({
	selector: 'app-track',
	imports: [CommonModule, AudioSectionComponent, CommentSectionComponent, LoadingSpinnerComponent],
	providers: [TrackService],
	standalone: true,
	template: `
		<!-- Loading Screen -->
		<div class="loading-container" *ngIf="!trackService.isDataLoaded">
			<div class="loading-content">
				<app-loading-spinner/>
			</div>
		</div>

		<!-- Main Content -->
		<div class="container" *ngIf="trackService.isDataLoaded">
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

	requestedData = false;

	constructor(
		private route: ActivatedRoute,
		public trackService: TrackService,
	) {}

	async ngOnInit() {
		this.route.paramMap
			.pipe(take(1))
			.subscribe(async (params) => {
			const trackId = params.get('trackId');
				if (trackId && !this.requestedData) {
					this.trackService.projectId = trackId;
					this.requestedData = true;
					await this.trackService.loadTrack(trackId, this.abortController.signal);
					await this.trackService.loadWaveform(trackId, this.abortController.signal);
				}
			});
	}
	ngOnDestroy(): void {
		this.abortController.abort();
	}


}
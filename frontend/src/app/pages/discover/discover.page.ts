import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DiscoverService } from './discover.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Author } from '@shared/types';

@Component({
	selector: 'app-discover',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule],
	providers: [DiscoverService],
	template: `
		<div class="container">
			<div class="controls">
			</div>

			<div class="list">
				<div 
					class="released-item" 
					*ngFor="let track of discoverService.projects()"
					(click)="onReleasedItemClick(track.metadata.projectId)">
					<div class="metadata">
						<div class="title">{{ track.metadata.title }}</div>
						<div class="author">{{ authorsString(track.metadata.authors) }}</div>
					</div>
					<span class="spacer"></span>
					<div class="stats">
						<div class="stat">
							<mat-icon>play_arrow</mat-icon>
							<span>{{ track.front.plays }}</span>
						</div>
						<div class="stat">
							<mat-icon>favorite</mat-icon>
							<span>{{ track.front.likes }}</span>
						</div>
					</div>
					<div class="data">
						<mat-icon>calendar_today</mat-icon>
						<span>{{ track.front.dateReleased | date:'mediumDate' }}</span>
					</div>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./discover.page.scss']
})
export class DiscoverPage {
	projectId: string | null = null;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public discoverService: DiscoverService
	) {
		discoverService.getMoreTracks();
	}

	get projects() { return this.discoverService.projects }

	onReleasedItemClick(projectId: string) {
		this.router.navigate(['/track', projectId]);
	}

	authorsString(authors: Author[]) {
		if (authors.length === 0) {
			return '';
		}
		return authors.map(author => author.displayName).join(', ');
	}

}
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal, HostListener, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DiscoverService, ListMode } from '../discover.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Author, ProjectReleased, RelevantProjectOrUser } from '@shared/types';

@Component({
	selector: 'app-discover-track-item',
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule],
	template: `
		<div 
			class="item" 
			(click)="onItemClick()">
			<div class="metadata">
				<div class="title">{{ item.front!.title }}</div>
				<div class="author">{{ authorsString(item.metadata!.authors) }}</div>
			</div>
			<span class="spacer"></span>
			<div class="stats">
				<div class="stat">
					<mat-icon>play_arrow</mat-icon>
					<span>{{ item.front!.plays }}</span>
				</div>
				<div class="stat">
					<mat-icon>favorite</mat-icon>
					<span>{{ item.front!.likes }}</span>
				</div>
			</div>
			<div class="data">
				<mat-icon>calendar_today</mat-icon>
				<span>{{ item.front!.dateReleased | date:'mediumDate' }}</span>
			</div>
		</div>
	`,
	styleUrls: ['./track-item.component.scss']
})
export class TrackItem {
	@Input() item!: RelevantProjectOrUser;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public discoverService: DiscoverService
	) {}

	onItemClick() {
		this.router.navigate(['/track', this.item.metadata!.projectId]);
	}

	// ==============================================================
	// Helpers

	authorsString(authors: Author[]) {
		if (authors.length === 0) {
			return '';
		}
		return authors.map(author => author.displayName).join(', ');
	}
}
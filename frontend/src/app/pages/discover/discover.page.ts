import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, ViewChildren, QueryList, signal, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { DiscoverService, ListMode } from './discover.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Author } from '@shared/types';
import { TrackItem } from "./track-item/track-item.component";

import { RelevantProjectOrUser } from '@shared/types';
import { UserItem } from "./user-item/user-item.component";
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";

@Component({
	selector: 'app-discover',
	standalone: true,
	imports: [CommonModule, RouterModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule, FormsModule, TrackItem, UserItem, LoadingSpinnerComponent],
	providers: [DiscoverService],
	template: `
		<div class="container" #scrollContainer>
			<div class="controls">
				<button 
					class="control-btn"
					[class.selected]="discoverService.listMode() == ListMode.New"
					(click)="selectNew()">
					<mat-icon>access_time</mat-icon>
					<span class="control-label">New</span>
				</button>
				<button 
					class="control-btn"
					[class.selected]="discoverService.listMode() == ListMode.Hot"
					(click)="selectHot()">
					<mat-icon>whatshot</mat-icon>
					<span class="control-label">Hot</span>
				</button>
				
				<div class="search-container">
					<div class="search-bar">
						<mat-icon class="search-icon">search</mat-icon>
						<input 
							class="search-input" 
							placeholder="search..." 
							type="text"
							[(ngModel)]="discoverService.searchTerm"/>
					</div>
					<button 
						class="search-btn"
						[class.selected]="discoverService.listMode() == ListMode.Search"
						(click)="doSearch()">
						<span class="control-label">Search</span>
					</button>
				</div>
			</div>

			<div class="list">		
				<div *ngFor="let item of discoverService.projectsAndUsers()" class="item">
					<app-discover-track-item class="item" *ngIf="!item._itemType || item._itemType == 'track'"
						[item]="item"
					/>
					<app-discover-user-item class="item" *ngIf="item._itemType == 'user'"
						[item]="item"
					/>
				</div>

				<button 
					class="load-btn"
					(click)="loadMoreItems()"
					*ngIf="!discoverService.reachedEnd">
					<span class="label-text">Load more</span>
				</button>
				
				<!-- Loading indicator at bottom -->
				<div class="loading-more" *ngIf="isLoadingMore()">
					<app-loading-spinner/>
				</div>
			</div>
		</div>
	`,
	styleUrls: ['./discover.page.scss']
})
export class DiscoverPage implements OnDestroy {
	@ViewChild('scrollContainer', { static: true }) scrollContainer!: ElementRef;
	private abortController = new AbortController();

	ListMode = ListMode;
	
	projectId: string | null = null;

	get isLoadingMore() { return this.discoverService.isLoadingMore }
	get items() { return this.discoverService.projectsAndUsers; }

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public discoverService: DiscoverService
	) {
		discoverService.getMoreItems(false, this.abortController.signal);
	}

	ngOnDestroy(): void {
		this.abortController.abort();
	}

	selectNew() {
		this.discoverService.listMode.set(ListMode.New);
		this.discoverService.getMoreItems(true, this.abortController.signal);
	}
	selectHot() {
		this.discoverService.listMode.set(ListMode.Hot);
		this.discoverService.getMoreItems(true, this.abortController.signal);
	}
	doSearch() {
		this.discoverService.listMode.set(ListMode.Search);
		this.discoverService.getMoreItems(true, this.abortController.signal);
	}

	async loadMoreItems() {
		if (this.isLoadingMore() || this.discoverService.reachedEnd) {
			return;
		}

		try {
			this.isLoadingMore.set(true);
			await this.discoverService.getMoreItems(false, this.abortController.signal);
		} catch (error) {
			console.error('Error loading more tracks:', error);
		} finally {
			this.isLoadingMore.set(false);
		}
	}

}
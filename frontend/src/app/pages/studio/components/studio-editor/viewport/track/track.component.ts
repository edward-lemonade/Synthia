import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../../services/viewport.service';
import { Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { TrackSelectionService } from '@src/app/pages/studio/services/track-selection.service';
import { RegionComponent } from "./region/region.component";

import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

@Component({
	selector: 'viewport-track',
	imports: [CommonModule, RegionComponent, MatMenuModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track"
			[style.--highlight-color]="color()"
			[style.background-color]="isSelected() ? colorSelectedBg() : 'transparent'"
			(click)="select()"
			(contextmenu)="select()"
			[matContextMenuTriggerFor]="menu">

			<viewport-track-region 
				*ngFor="let region of getRegions(); let i = index"
				class="track"
				[track]="track"
				[trackIndex]="index"
				[regionIndex]="i"
			/>
		</div>

		<mat-menu #menu [class]="'track-menu'">
			<div class="track-menu-content">
				<button class="track-menu-btn" mat-menu-item (click)="createRegion()">
					<mat-icon>add</mat-icon>
					Create region
				</button>
				<button class="track-menu-btn" mat-menu-item (click)="createRegion()">
					<mat-icon>add</mat-icon>
					Create region
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './track.component.scss'
})

export class TrackComponent {
	@Input() track!: Track;
	@Input() index!: number;
	@ViewChild('trackMenuTrigger', { static: true }) trackMenuTrigger!: MatMenuTrigger;

	constructor (
		public projectState : ProjectState,
		public viewportService : ViewportService,
		public trackSelectService : TrackSelectionService,
	) {}

	color = computed(() => this.track.color);
	colorSelectedBg = computed(() => this.trackSelectService.selectedBgColor(this.track.color));
	isSelected = computed(() => this.trackSelectService.selectedTrack() == this.index);
	select() { this.trackSelectService.setSelectedTrack(this.index); }

	getRegions() { return this.track.regions; }
	createRegion() {

	}
}

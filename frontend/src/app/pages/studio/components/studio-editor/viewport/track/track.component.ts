import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../../services/viewport.service';
import { Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';
import { RegionComponent } from "./region/region.component";

import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ProjectStateTracks } from '@src/app/pages/studio/services/substates';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';

@Component({
	selector: 'viewport-track',
	imports: [CommonModule, RegionComponent, MatMenuModule, MatIconModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track"
			[style.--highlight-color]="color()"
			[style.background-color]="isSelected() ? colorSelectedBg() : 'transparent'"
			(click)="onClick()"
			(contextmenu)="onClick(); onContextMenu($event)"
			[matContextMenuTriggerFor]="menu">

			<viewport-track-region 
				*ngFor="let region of getRegions(); let i = index"
				
				[track]="track"
				[region]="region"
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

	declare tracksState : ProjectStateTracks

	constructor (
		public projectState : ProjectState,
		public viewportService : ViewportService,
		public trackSelectService : RegionSelectService,
		public dragService : RegionDragService,
	) {
		this.tracksState = projectState.tracksState;
	}

	color = computed(() => this.track.color);
	colorSelectedBg = computed(() => this.trackSelectService.selectedTrackBgColor(this.track.color));
	isSelected = computed(() => this.trackSelectService.selectedTrack() == this.index);
	onClick() { 
		this.trackSelectService.setSelectedTrack(this.index); 
	}


	mouseX = 0; //  relative to this track div
	onContextMenu(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement;
  		const rect = target.getBoundingClientRect();
		this.mouseX = event.clientX - rect.left;
	} 

	getRegions() { return this.track.regions; }
	createRegion() {
		const pos = this.viewportService.mouseToPos(this.mouseX);
		this.tracksState.addRegion(this.index, this.track.isMidi, pos);
	}
}

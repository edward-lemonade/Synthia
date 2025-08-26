import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../../services/viewport.service';
import { RegionType, Track } from '@shared/types';

import { RegionSelectService } from '@src/app/pages/studio/services/region-select.service';
import { RegionComponent } from "./region/region.component";

import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { TracksService } from '@src/app/pages/studio/services/tracks.service';
import { StateNode } from '@src/app/pages/studio/state/state.factory';
import { StateService } from '@src/app/pages/studio/state/state.service';

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
				*ngFor="let region of track.regions(); let i = index"
				
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

export class TrackComponent{
	@Input() track!: StateNode<Track>;
	@Input() index!: number;
	@ViewChild('trackMenuTrigger', { static: true }) trackMenuTrigger!: MatMenuTrigger;

	constructor (
		public stateService : StateService,
		public viewportService : ViewportService,
		public trackSelectService : RegionSelectService,
		public dragService : RegionDragService,
		public tracksService : TracksService,
	) {}
	
	color = computed(() => this.track.color);
	colorSelectedBg = computed(() => this.trackSelectService.selectedTrackBgColor(this.track.color()));
	isSelected = computed(() => this.trackSelectService.selectedTrack() == this.index);
	onClick() { 
		this.trackSelectService.setSelectedTrack(this.index); 
	}

	mouseX = 0; 
	onContextMenu(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			this.mouseX = event.clientX - rect.left;
		} else {
			event.preventDefault();
			event.stopPropagation();
		}
	} 

	getRegions() { return this.track.regions; }
	createRegion() {
		const pos = this.viewportService.pxToPos(this.mouseX);
		if (this.track.regionType() == RegionType.Audio) {
			this.tracksService.addAudioRegion(this.index, {start: pos});
		} else {
			this.tracksService.addMidiRegion(this.index, {start: pos});
		}
	}
}

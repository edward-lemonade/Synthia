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
import { ObjectStateNode, StateNode } from '@src/app/pages/studio/state/state.factory';
import { StateService } from '@src/app/pages/studio/state/state.service';
import { RegionService } from '@src/app/pages/studio/services/region.service';

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
					<p>Create region</p>
				</button>
			</div>
		</mat-menu>
	`,
	styleUrl: './track.component.scss'
})

export class TrackComponent{
	@Input() track!: ObjectStateNode<Track>;
	@Input() index!: number;
	@ViewChild('trackMenuTrigger', { static: true }) trackMenuTrigger!: MatMenuTrigger;

	constructor (
		public stateService : StateService,
		public viewportService : ViewportService,
		public selectService : RegionSelectService,
		public dragService : RegionDragService,
		public tracksService : TracksService,
		public regionService : RegionService
	) {}
	
	color = computed(() => this.track.color);
	colorSelectedBg = computed(() => this.selectService.selectedTrackBgColor(this.track.color()));
	isSelected = computed(() => this.selectService.selectedTrack()?._id == this.track._id);
	onClick() { 
		this.selectService.setSelectedTrack(this.track); 
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
		let pos = this.viewportService.pxToPos(this.mouseX, false);
		if (this.viewportService.snapToGrid()) {
			pos = this.viewportService.snapFloor(pos);
		}

		if (this.track.regionType() == RegionType.Audio) {
			this.regionService.addAudioRegion(this.track, {start: pos});
		} else {
			this.regionService.addMidiRegion(this.track, {start: pos});
		}
	}
}

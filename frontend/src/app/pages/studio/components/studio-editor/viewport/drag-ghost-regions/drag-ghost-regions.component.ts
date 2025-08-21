import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegionSelectService } from '../../../../services/region-select.service';
import { ViewportService } from '../../../../services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';

export interface GhostRegion {
	left: number;
	top: number;
	width: number;
	height: number;
	color: string;
}

@Component({
	selector: 'drag-ghost-regions',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div *ngIf="dragService.isDragging()" class="drag-preview-container">
			<div *ngFor="let ghostRegion of getGhostRegions()" 
				class="drag-ghost-region"
				[style.left.px]="ghostRegion.left"
				[style.top.px]="ghostRegion.top"
				[style.width.px]="ghostRegion.width"
				[style.height.px]="ghostRegion.height"
				[style.background-color]="ghostRegion.color">
			</div>
		</div>
	`,
	styleUrl: './drag-ghost-regions.component.scss'
})
export class DragGhostRegionsComponent {
	@Input() tracks: any[] = [];
	@Input() trackHeight: number = 0;
	@Input() tracksElement!: HTMLElement;
	@Input() containerElement!: HTMLElement;
	@Input() scrollContainerElement!: HTMLElement;

	constructor(
		public selectionService: RegionSelectService,
		public dragService: RegionDragService,
		private viewportService: ViewportService
	) {}

	getGhostRegions(): GhostRegion[] {
		const dragInfo = this.dragService.getDragInfo();

		if (!dragInfo || !this.tracksElement || !this.containerElement || !this.scrollContainerElement) {
			return [];
		}

		const selectedRegions = this.selectionService.selectedRegions();
		
		return selectedRegions.map(({ trackIndex, regionIndex }) => {
			const track = this.tracks[trackIndex];
			const region = track?.regions[regionIndex];
			
			if (!region) return null;
			
			const left = this.viewportService.posToPx(region.start) + (dragInfo.deltaPosX * this.viewportService.measureWidth());
			const top = this.getTrackTopPosition(trackIndex);
			const width = region.duration * this.viewportService.measureWidth();
			
			return {
				left,
				top,
				width,
				height: this.trackHeight,
				color: this.getRegionGhostColor(track, region)
			};
		}).filter((ghost): ghost is GhostRegion => ghost !== null);
	}

	private getTrackTopPosition(trackIndex: number): number {
		return trackIndex * this.trackHeight;
	}
	
	private getRegionGhostColor(track: any, region: any): string {
		const baseColor = track.color || region.color || '#007bff';
		
		if (baseColor.startsWith('#')) {
			const r = parseInt(baseColor.slice(1, 3), 16);
			const g = parseInt(baseColor.slice(3, 5), 16);
			const b = parseInt(baseColor.slice(5, 7), 16);
			return `rgba(${r}, ${g}, ${b}, 0.4)`;
		}

		const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
		if (rgbMatch) {
			return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.4)`;
		}
		
		return 'rgba(0, 123, 255, 0.4)';
	}
}
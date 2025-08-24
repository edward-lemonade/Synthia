import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region, Track } from '@shared/types';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { Stateify } from '@src/app/pages/studio/state/state.factory';


@Component({
	selector: 'drag-ghost',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="region-ghost"
			[style.left.px]="viewportService.posToPx(region.start() + dragService.dragInfo()!.deltaPosX)"
			[style.width.px]="viewportService.posToPx(region.duration())"
			[style.background-color]="getRegionGhostColor()">
		</div>
	`,
	styleUrl: './ghost.component.scss'
})
export class DragGhostComponent {
	@Input() track!: Stateify<Track>;
	@Input() region!: Stateify<Region>;

	constructor (
		public viewportService: ViewportService,
		public dragService: RegionDragService,
	) {}

	public getRegionGhostColor(): string {
		const baseColor = this.track.color() || '#007bff';
		
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

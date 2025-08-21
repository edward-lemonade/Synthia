import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region, Track } from '@shared/types';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';

@Component({
	selector: 'resize-ghost',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="region-ghost"
			[style.left.px]="viewportService.posToPx(ghost!.start)"
			[style.width.px]="viewportService.posToPx(ghost!.duration)"
			[style.background-color]="getRegionGhostColor()">
		</div>
	`,
	styleUrl: './ghost.component.scss'
})

export class ResizeGhostComponent {
	@Input() track!: Track;
	@Input() ghost!: { start: number; duration: number } | null

	constructor (
		public viewportService: ViewportService,
		public dragService: RegionDragService,
	) {}

	getRegionGhostColor(): string {
		const baseColor = this.track.color || '#007bff';
		
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

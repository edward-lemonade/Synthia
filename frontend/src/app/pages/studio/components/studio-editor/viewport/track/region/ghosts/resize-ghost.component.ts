import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Region, Track } from '@shared/types';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { StateNode } from '@src/app/pages/studio/state/state.factory';
import { getRegionGhostColor } from '@src/app/utils/color';

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
			[style.background-color]="ghostColor">
		</div>
	`,
	styleUrl: './ghost.component.scss'
})

export class ResizeGhostComponent {
	@Input() track!: StateNode<Track>;
	@Input() ghost!: { start: number; duration: number } | null

	constructor (
		public viewportService: ViewportService,
		public dragService: RegionDragService,
	) {}

	get ghostColor() { return getRegionGhostColor(this.track.color()) }
}

import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { TrackSelectionService } from '@src/app/pages/studio/services/track-selection.service';

@Component({
	selector: 'viewport-track-region',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="region"
			[style.--highlight-color]="color()"
			[style.border-color]="isSelected() ? 'white' : 'transparent'"
			(click)="select()"
			>
			
		</div>
	`,
	styleUrl: './region.component.scss'
})

export class RegionComponent {
	@Input() track!: Track;
	@Input() trackIndex!: number;
	@Input() regionIndex!: number;

	constructor (
		public projectState : ProjectState,
		public trackSelectService : TrackSelectionService,
	) {}

	color = computed(() => this.track.color);
	isSelected = computed(() => 
		this.trackSelectService.selectedTrack() == this.trackIndex && 
		this.trackSelectService.selectedRegion() == this.regionIndex
	);
	select() { this.trackSelectService.setSelectedTrack(this.trackIndex); this.trackSelectService.setSelectedRegion(this.regionIndex)}
}

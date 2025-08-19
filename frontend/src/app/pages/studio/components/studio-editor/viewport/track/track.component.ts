import { ChangeDetectionStrategy, Component, computed, ElementRef, Input, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportService } from '../../../../services/viewport.service';
import { Track } from '@shared/types';

import { ProjectState } from '@src/app/pages/studio/services/project-state.service';
import { TrackSelectionService } from '@src/app/pages/studio/services/track-selection.service';

@Component({
	selector: 'viewport-track',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="track"
			[style.--highlight-color]="color()"
			[style.background-color]="isSelected() ? 'rg' : 'transparent'"
			>
			{{index}}
		</div>
	`,
	styleUrl: './track.component.scss'
})

export class TrackComponent {
	@Input() track!: Track;
	@Input() index!: number;

	constructor (
		public projectState : ProjectState,
		public viewportService : ViewportService,
		public trackSelectService : TrackSelectionService,
	) {}

	color = computed(() => this.track.color);
	isSelected = computed(() => this.trackSelectService.selectedTrack() == this.index);
}

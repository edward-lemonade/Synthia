import { Component, Input, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MidiNote, Region, Track } from '@shared/types';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { ObjectStateNode, StateNode } from '@src/app/pages/studio/state/state.factory';
import { getRegionGhostColor } from '@src/app/utils/color';
import { MidiService } from '@src/app/pages/studio/services/midi.service';

@Component({
	selector: 'midi-note-resize-ghost',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="note-ghost"
			[style.left.px]="viewportService.posToPx(ghost!.start)"
			[style.width.px]="viewportService.posToPx(ghost!.duration)"
			[style.top.px]="TOP_PX"
			[style.height.px]="HEIGHT_PX"
			[style.background-color]="'#989898ff'">
		</div>
	`,
	styleUrl: './ghost.component.scss'
})

export class ResizeGhostComponent {
	@Input() note!: ObjectStateNode<MidiNote>;
	@Input() ghost!: { start: number; duration: number } | null

	constructor (
		public viewportService: ViewportService,
		public dragService: RegionDragService,
		public midiService: MidiService,
	) {}

	get TOP_PX() { return this.midiService.getNoteTop(this.note); } 
	get HEIGHT_PX() { return this.midiService.ROW_HEIGHT } 
}

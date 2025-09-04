import { Component, Input, ChangeDetectionStrategy, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MidiNote, Region, Track } from '@shared/types';
import { ViewportService } from '@src/app/pages/studio/services/viewport.service';
import { RegionDragService } from '@src/app/pages/studio/services/region-drag.service';
import { StateNode } from '@src/app/pages/studio/state/state.factory';
import { getRegionGhostColor } from '@src/app/utils/color';
import { MidiService } from '@src/app/pages/studio/services/midi.service';
import { MidiDragService } from '@src/app/pages/studio/services/midi-drag.service';


@Component({
	selector: 'midi-note-drag-ghost',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div 
			class="note-ghost"
			[style.left.px]="viewportService.posToPx(note.start() + dragService.dragInfo()!.deltaPosX)"
			[style.width.px]="viewportService.posToPx(note.duration())"
			[style.top.px]="midiService.pitchToPx(note.pitch() + dragService.dragInfo()!.deltaPitch)"
			[style.height.px]="HEIGHT_PX"
			[style.background-color]="'#989898ff'">
		</div>
	`,
	styleUrl: './ghost.component.scss'
})
export class DragGhostComponent {
	@Input() note!: StateNode<MidiNote>;

	constructor (
		public viewportService: ViewportService,
		public dragService: MidiDragService,
		public midiService: MidiService,
	) {}

	get HEIGHT_PX() { return this.midiService.ROW_HEIGHT } 
}

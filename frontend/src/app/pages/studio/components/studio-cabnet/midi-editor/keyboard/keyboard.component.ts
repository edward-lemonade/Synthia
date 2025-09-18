import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, signal, ViewChild } from "@angular/core";
import { MidiNote } from "@shared/types";
import { MidiEditorService } from "@src/app/pages/studio/services/midi-editor/midi-editor.service";
import { TimelinePlaybackService } from "@src/app/pages/studio/services/timeline-playback.service";
import { ViewportService } from "@src/app/pages/studio/services/viewport.service";

@Component({
	selector: 'midi-editor-keyboard',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #keyboard class="keyboard" (scroll)="onScroll()">
			<div class="keyboard-content" [style.height.px]="TOTAL_HEIGHT">
				<div 
					*ngFor="let scale of scalesLabelArray(); let scaleIndex = index"
					class="scale">

					<!-- White keys for this scale -->
					<div 
						*ngFor="let whiteKey of whiteKeys; let keyIndex = index"
						class="key white-key" 
						(click)="onKeyClick(whiteKey.note, scaleIndex)"
						[style.height.px]="WHITE_KEY_HEIGHT">
						{{ whiteKey.name }}{{ scale.octave }}
					</div>

					<!-- Black keys for this scale -->
					<div 
						*ngFor="let blackKey of blackKeys let keyIndex = index"
						class="key black-key" 
						(click)="onKeyClick(blackKey.note, scaleIndex)"
						[style.height.px]="BLACK_KEY_HEIGHT"
						[style.top.px]="(blackKey.vOffset * this.WHITE_KEY_HEIGHT) - (this.BLACK_KEY_HEIGHT / 2)">
						{{ blackKey.name }}{{ scale.octave }}
					</div>

				</div>
			</div>
		</div>
	`,
	styleUrl: './keyboard.component.scss'
})
export class MidiEditorKeyboardComponent implements OnInit {
	@ViewChild('keyboard', { static: true, read: ElementRef }) scrollable!: ElementRef<HTMLDivElement>;

	constructor (
		public viewportService: ViewportService,
		public midiService: MidiEditorService,
		public playbackService: TimelinePlaybackService,
	) {}

	get SCALES() { return this.midiService.SCALES };
	get SCALE_HEIGHT() { return this.midiService.SCALE_HEIGHT };
	get ROW_HEIGHT() { return this.midiService.ROW_HEIGHT };
	get TOTAL_HEIGHT(): number {return this.SCALES! * this.SCALE_HEIGHT!;}
	declare WHITE_KEY_HEIGHT: number;
	declare BLACK_KEY_HEIGHT: number;

	ngOnInit() {
		this.WHITE_KEY_HEIGHT = this.SCALE_HEIGHT / 7;
		this.BLACK_KEY_HEIGHT = this.SCALE_HEIGHT / 12;

		this.viewportService.registerTracklistScrollable(this.scrollable.nativeElement);

		this.scalesLabelArray.set(
			Array.from({ length: this.SCALES }, (_, i) => ({
				octave: (this.SCALES - i) // highest octave at top
			}))
		)
	}

	// ==============================================================================================
	// Keyboard Render

	scalesLabelArray = signal<any[]>([])

	whiteKeys = [
		{ name: 'B', note: 0 },
		{ name: 'A', note: 2 },
		{ name: 'G', note: 4 },
		{ name: 'F', note: 6 },
		{ name: 'E', note: 7 },
		{ name: 'D', note: 9 },
		{ name: 'C', note: 11 }
	];
	blackKeys = [
		{ name: 'A#', note: 1, vOffset: 1 },
		{ name: 'G#', note: 3, vOffset: 2 },
		{ name: 'F#', note: 5, vOffset: 3 },
		{ name: 'D#', note: 8, vOffset: 5 },
		{ name: 'C#', note: 10, vOffset: 6 },
	]

	onKeyClick(midiNote: number, scaleIndex: number) {
		this.midiService.playSampleNoteFromIndex(12*scaleIndex + midiNote);
	}

	// ==============================================================================================
	// Mouse Events

	onScroll() {
		const scrollPos = this.scrollable.nativeElement.scrollTop;
		if (scrollPos != this.viewportService.windowPosY()) {
			this.viewportService.setWindowPosY(scrollPos);
		}
	}
}
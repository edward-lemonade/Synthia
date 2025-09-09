import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { MidiEditorService } from "@src/app/pages/studio/services/midi-editor/midi-editor.service";
import { ViewportService } from "@src/app/pages/studio/services/viewport.service";
import { MIDI_DRUM_MAPPING } from "@shared/audio-processing/synthesis/presets/drums";

@Component({
	selector: 'midi-drum-editor-keyboard',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #keyboard class="keyboard" (scroll)="onScroll()">
			<div class="keyboard-content" [style.height.px]="totalHeight">
				<div 
					*ngFor="let key of drumKeys; let keyIndex = index"
					class="key drum-key" 
					[style.height.px]="ROW_HEIGHT">
					{{ MIDI_DRUM_MAPPING[midiService.indexToMidiNote(keyIndex)] }}
				</div>
			</div>
		</div>
	`,
	styleUrl: './drum-keyboard.component.scss'
})
export class MidiDrumEditorKeyboardComponent implements OnInit {
	@ViewChild('keyboard', { static: true, read: ElementRef }) scrollable!: ElementRef<HTMLDivElement>;
	MIDI_DRUM_MAPPING = MIDI_DRUM_MAPPING;

	constructor (
		public viewportService: ViewportService,
		public midiService: MidiEditorService,
	) {}

	get SCALES() { return this.midiService.SCALES };
	get SCALE_HEIGHT() { return this.midiService.SCALE_HEIGHT };
	get ROW_HEIGHT() { return this.midiService.ROW_HEIGHT };
	declare drumKeys: Array<number>;

	ngOnInit() {
		this.viewportService.registerTracklistScrollable(this.scrollable.nativeElement);
		this.drumKeys = Array(this.SCALES * 12).fill(0).map((_, i) => i);
	}


	// ==============================================================================================
	// Keyboard Render
	
	get totalHeight(): number {
		return this.SCALES! * this.SCALE_HEIGHT!;
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
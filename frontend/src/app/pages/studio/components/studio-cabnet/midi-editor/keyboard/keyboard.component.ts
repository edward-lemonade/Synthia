import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";
import { ViewportService } from "@src/app/pages/studio/services/viewport.service";

@Component({
	selector: 'midi-editor-keyboard',
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div #keyboard class="keyboard" (scroll)="onScroll()">
			<div class="keyboard-content" [style.height.px]="totalHeight">
				<div 
					*ngFor="let scale of scalesLabelArray; let scaleIndex = index"
					class="scale">

					<!-- White keys for this scale -->
					<div 
						*ngFor="let whiteKey of whiteKeys; let keyIndex = index"
						class="key white-key" 
						[style.height.px]="WHITE_KEY_HEIGHT">
						{{ whiteKey.note }}{{ scale.octave }}
					</div>

					<!-- Black keys for this scale -->
					<div 
						*ngFor="let blackKey of getBlackKeysForScale(scale)"
						class="key black-key" 
						[style.height.px]="BLACK_KEY_HEIGHT"
						[style.top.px]="blackKey.position">
						{{ blackKey.note }}{{ scale.octave }}
					</div>
				</div>
			</div>
		</div>
	`,
	styleUrl: './keyboard.component.scss'
})
export class MidiEditorKeyboardComponent implements OnInit {
	@Input() SCALES: number = 0;
	@Input() SCALE_HEIGHT: number = 0;
	@ViewChild('keyboard', { static: true, read: ElementRef }) scrollable!: ElementRef<HTMLDivElement>;

	declare ROW_HEIGHT: number;

	declare WHITE_KEY_HEIGHT: number;
	declare BLACK_KEY_HEIGHT: number;

	constructor (
		public viewportService : ViewportService,
	) {}

	ngOnInit() {
		this.ROW_HEIGHT = this.SCALE_HEIGHT / 12;

		this.WHITE_KEY_HEIGHT = this.SCALE_HEIGHT / 7;
		this.BLACK_KEY_HEIGHT = this.SCALE_HEIGHT / 12;

		this.viewportService.registerTracklistScrollable(this.scrollable.nativeElement);
	}


	// ==============================================================================================
	// Keyboard Render

	get scalesLabelArray() {
		return Array.from({ length: this.SCALES }, (_, i) => ({
			octave: (this.SCALES - 1 - i) + 2 // Reverse order: highest octave at top
		}));
	}
	
	get totalHeight(): number {
		return this.SCALES! * this.SCALE_HEIGHT!;
	}

	whiteKeys = [
		{ note: 'B' },
		{ note: 'A' },
		{ note: 'G' },
		{ note: 'F' },
		{ note: 'E' },
		{ note: 'D' },
		{ note: 'C' }
	];

	getBlackKeysForScale(scale: { octave: number }) {
		const blackKeyPositions = [1, 2, 3, 5, 6]; // A#, G#, F#, D#, C#
		
		return blackKeyPositions.map(whiteKeyIndex => ({
			note: this.getBlackKeyNote(whiteKeyIndex),
			octave: scale.octave,
			position: (whiteKeyIndex * this.WHITE_KEY_HEIGHT) - (this.BLACK_KEY_HEIGHT / 2)
		}));
	}
	
	private getBlackKeyNote(whiteKeyIndex: number): string {
		const blackNoteNames = ['A#', 'G#', 'F#', 'D#', 'C#'];
		const blackKeyMap = [-1, 0, 1, 2, -1, 3, 4]; // Map reversed positions to black note names
		const blackKeyIdx = blackKeyMap[whiteKeyIndex];
		return blackKeyIdx >= 0 ? blackNoteNames[blackKeyIdx] : '';
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
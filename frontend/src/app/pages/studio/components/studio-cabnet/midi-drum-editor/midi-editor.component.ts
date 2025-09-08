import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Injector } from "@angular/core";
import { MidiEditorService } from "../../../services/midi-editor/midi-editor.service";
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ViewportService } from "../../../services/viewport.service";
import { MidiSelectService } from "../../../services/midi-editor/midi-select.service";
import { MidiDragService } from "../../../services/midi-editor/midi-drag.service";
import { CabnetService } from "../../../services/cabnet.service";
import { AudioTrackType, MidiTrackType, TrackType } from "@shared/types";
import { ViewportComponent } from "../midi-editor/viewport/viewport.component";
import { ViewportOverlayComponent } from "../midi-editor/viewport-overlay/viewport-overlay.component";
import { ViewportHeaderComponent } from "../midi-editor/viewport-header/viewport-header.component";
import { MidiDrumEditorKeyboardComponent } from "./keyboard/drum-keyboard.component";


@Component({
	selector: 'midi-drum-editor',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, ViewportComponent, ViewportOverlayComponent, ViewportHeaderComponent, MidiDrumEditorKeyboardComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ViewportService, MidiEditorService, MidiSelectService, MidiDragService],
	template: `
		<div class="container">
			<div class="info"></div>
			<div class="keyboard-container">
				<div class="keyboard-header"></div>
				<midi-drum-editor-keyboard class="keyboard"/>
			</div>
			<div class="viewport-container">
				<midi-editor-viewport-header class="viewport-header"/>
				<midi-editor-viewport class="viewport-body"/>
				<midi-editor-viewport-overlay/>
			</div>
		</div>
	`,
	styleUrl: './midi-editor.component.scss'
})

export class MidiDrumEditorComponent {
	AudioTrackType = AudioTrackType;
	MidiTrackType = MidiTrackType;

	constructor(
		viewportService: ViewportService,
		midiService: MidiEditorService,
		public cabnetService: CabnetService,
	) {
		viewportService.setZoom(3);
		viewportService.setWindowPosY(midiService.SCALES * midiService.SCALE_HEIGHT / 2)
		this.trackType = this.cabnetService.selectedTrack()?.trackType();
	}

	declare trackType: TrackType | undefined;
	
}

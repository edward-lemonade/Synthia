import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Injector } from "@angular/core";
import { MidiEditorService } from "../../../services/midi-editor/midi-editor.service";
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ViewportService } from "../../../services/viewport.service";
import { ViewportComponent } from "./viewport/viewport.component";
import { ViewportOverlayComponent } from "./viewport-overlay/viewport-overlay.component";
import { ViewportHeaderComponent } from "./viewport-header/viewport-header.component";
import { MidiEditorKeyboardComponent } from "./keyboard/keyboard.component";
import { MidiSelectService } from "../../../services/midi-editor/midi-select.service";
import { MidiDragService } from "../../../services/midi-editor/midi-drag.service";
import { CabnetService } from "../../../services/cabnet.service";


@Component({
	selector: 'midi-editor',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, ViewportComponent, ViewportOverlayComponent, ViewportHeaderComponent, MidiEditorKeyboardComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ViewportService, MidiEditorService, MidiSelectService, MidiDragService],
	template: `
		<div class="container">
			<div class="info"></div>
			<div class="keyboard-container">
				<div class="keyboard-header"></div>
				<midi-editor-keyboard class="keyboard"/>
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

export class MidiEditorComponent {
	constructor(
		viewportService: ViewportService,
		midiService: MidiEditorService,
		public cabnetService: CabnetService,
	) {
		viewportService.setZoom(3);
		viewportService.setWindowPosY(midiService.SCALES * midiService.SCALE_HEIGHT / 2)
	}
}

import { CommonModule } from "@angular/common";
import { TrackType, MidiTrackType, AudioTrackType, Track } from "@shared/types";
import { ChangeDetectionStrategy, Component, Injector } from "@angular/core";
import { MidiService } from "../../../services/midi.service";
import { CabnetService } from "../../../services/cabnet.service";

import { MatDivider } from "@angular/material/divider";
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ViewportService } from "../../../services/viewport.service";
import { ViewportComponent } from "./viewport/viewport.component";
import { ViewportOverlayComponent } from "./viewport-overlay/viewport-overlay.component";
import { ViewportHeaderComponent } from "./viewport-header/viewport-header.component";


@Component({
	selector: 'midi-editor',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, ViewportComponent, ViewportOverlayComponent, ViewportHeaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ViewportService],
	template: `
		<div class="container">
			<div class="info"></div>
			<div class="editor">
				<midi-editor-viewport-header class="viewport-header"/>
				<midi-editor-viewport class="viewport-body"/>
				<midi-editor-viewport-overlay/>
			</div>
		</div>
	`,
	styleUrl: './midi-editor.component.scss'
})

export class MidiEditorComponent {
}

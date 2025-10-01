import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed } from "@angular/core";

import { ViewportService } from "../../../services/viewport.service";
import { CabnetService } from "../../../services/cabnet.service";

import { SYNTHS } from "@shared/audio-processing/synthesis/presets/instruments";
import { TimelinePlaybackService } from "../../../services/timeline-playback.service";
import { FormsModule } from "@angular/forms";
import { ControlsComponent } from "./controls/controls.component";


@Component({
	selector: 'instrument-controls',
	imports: [CommonModule, FormsModule, ControlsComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="container">
			<controls/>
		</div>
	`,
	styleUrl: './instrument-controls.component.scss'
})

export class InstrumentControlsComponent {
	declare synthKeys: string[];

	constructor(
		public viewportService: ViewportService,
		public playbackService: TimelinePlaybackService,
		public cabnetService: CabnetService,
	) {
		this.synthKeys = Object.keys(SYNTHS);
	}

	get track() { return this.cabnetService?.selectedTrack() ?? null }

	// =======================================================================
	// Volume Control

	color = computed(() => this.track!.color());
}
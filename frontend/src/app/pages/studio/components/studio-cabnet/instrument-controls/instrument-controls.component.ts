import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, Injector, signal } from "@angular/core";

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';

import { ViewportService } from "../../../services/viewport.service";
import { CabnetService } from "../../../services/cabnet.service";

import { SYNTHS } from "../../../services/synths/presets/instruments";
import { RotaryKnobComponent } from "@src/app/components/rotary-knob/rotary-knob.component";
import { PlaybackService } from "../../../services/playback.service";
import { FormsModule } from "@angular/forms";
import { MatSliderModule } from "@angular/material/slider";
import { ControlsComponent } from "./controls/controls.component";


@Component({
	selector: 'instrument-controls',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, FormsModule, MatCardModule, MatSliderModule, ControlsComponent],
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
		public playbackService: PlaybackService,
		public cabnetService: CabnetService,
	) {
		this.synthKeys = Object.keys(SYNTHS);
	}

	get track() { return this.cabnetService?.selectedTrack() ?? null }

	// =======================================================================
	// Volume Control

	color = computed(() => this.track!.color());
}
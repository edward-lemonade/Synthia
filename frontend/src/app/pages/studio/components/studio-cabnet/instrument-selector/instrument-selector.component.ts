import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, Injector, signal } from "@angular/core";

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';

import { ViewportService } from "../../../services/viewport.service";
import { CabnetService } from "../../../services/cabnet.service";

import { SYNTHS } from "@shared/audio-processing/synthesis/presets/instruments";
import { TimelinePlaybackService } from "../../../services/timeline-playback.service";
import { FormsModule } from "@angular/forms";
import { MatSliderModule } from "@angular/material/slider";
import { ControlsComponent } from "../instrument-controls/controls/controls.component";


@Component({
	selector: 'instrument-selector',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, FormsModule, MatCardModule, MatSliderModule, ControlsComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="container" [style.--highlight-color]="color()">
			<div class="scroll-container">
				<div class="instrument-options">
					<ng-container *ngFor="let synthName of synthKeys; let i = index">
						<button
							class="instrument-option"
							[class.selected]="selectedInstrument && synthName == selectedInstrument"
							(click)="onSelect(synthName)">
							<p>{{synthName}}</p>
						</button>
					</ng-container>
				</div>
			</div>
			<controls/>
		</div>
	`,
	styleUrl: './instrument-selector.component.scss'
})

export class InstrumentSelectorComponent {
	declare synthKeys: string[];

	constructor(
		public viewportService: ViewportService,
		public playbackService: TimelinePlaybackService,
		public cabnetService: CabnetService,
	) {
		this.synthKeys = Object.keys(SYNTHS);
	}

	get track() { return this.cabnetService?.selectedTrack() ?? null }
	get selectedInstrument() { return this.track!.instrument() }

	// =======================================================================
	// Selector

	onSelect(synthName: string) {
		this.track?.instrument.set(synthName);
	}

	color = computed(() => this.track!.color());
}
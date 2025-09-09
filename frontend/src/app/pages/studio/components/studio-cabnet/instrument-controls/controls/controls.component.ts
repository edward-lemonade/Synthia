import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, effect, Injector, signal } from "@angular/core";

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';

import { ViewportService } from "../../../../services/viewport.service";
import { CabnetService } from "../../../../services/cabnet.service";

import { SYNTHS } from "@shared/audio-processing/synthesis/presets/instruments";
import { RotaryKnobComponent } from "@src/app/components/rotary-knob/rotary-knob.component";
import { TimelinePlaybackService } from "../../../../services/timeline-playback.service";
import { FormsModule } from "@angular/forms";
import { MatSliderModule } from "@angular/material/slider";


@Component({
	selector: 'controls',
	imports: [CommonModule, MatButtonModule, MatButtonToggleModule, RotaryKnobComponent, FormsModule, MatCardModule, MatSliderModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
			<div class="controls" [style.--highlight-color]="color()">
				<div class="card">
					<div class="title">Volume</div>
					<div class="body">
						<mat-slider class="slider" [style.--slider-color]="color()" min="0" max="100" step="1">
							<input matSliderThumb 
							[(ngModel)]="volumeInput" 
							(change)="updateVolume()"
							>
						</mat-slider>
					</div>
					<div class="value">
						<input
							type="text"
							maxlength="3"
							[(ngModel)]="volumeDisplayValue"
							(blur)="commitVolumeChange($event)"
							(keydown.enter)="commitVolumeChange($event)"
							placeholder="volume"
							class="text-input" />
					</div>
				</div>

				<div class="card">
					<div class="title">Pan</div>
					<div class="body">
						<app-rotary-knob
							[(ngModel)]="panInput"
							(blur)="updatePan()"
							[min]="-100"
							[max]="100" 
							[step]="1"
							[precision]="1"
							[size]="100"
							[color]="color()"/>
					</div>
					<div class="value">
						<input
							type="text"
							maxlength="4"
							[(ngModel)]="panDisplayValue"
							(blur)="commitPanChange($event)"
							(keydown.enter)="commitPanChange($event)"
							placeholder="pan"
							class="text-input" />
					</div>
				</div>

				<div class="card">
					<div class="title">Reverb</div>
					<div class="body">
						<mat-slider class="slider" [style.--slider-color]="color()" min="0" max="100" step="1">
							<input matSliderThumb 
							[(ngModel)]="reverbInput" 
							(change)="updateReverb()"
							>
						</mat-slider>
					</div>
					<div class="value">
						<input
							type="text"
							maxlength="3"
							[(ngModel)]="reverbDisplayValue"
							(blur)="commitReverbChange($event)"
							(keydown.enter)="commitReverbChange($event)"
							placeholder="reverb"
							class="text-input" />
					</div>
				</div>
			</div>
	`,
	styleUrl: './controls.component.scss'
})

export class ControlsComponent {
	declare synthKeys: string[];

	constructor(
		public viewportService: ViewportService,
		public playbackService: TimelinePlaybackService,
		public cabnetService: CabnetService,
	) {
		this.synthKeys = Object.keys(SYNTHS);

		effect(() => { 
			this.volumeInput.set(this.track!.volume());
			this.volumeDisplayValue.set(this.track!.volume().toString());
		});
		effect(() => { 
			this.panInput.set(this.track!.pan());
			this.panDisplayValue.set(this.track!.pan().toString());
		});
		effect(() => { 
			this.reverbInput.set(this.track!.reverb());
			this.reverbDisplayValue.set(this.track!.reverb().toString());
		});
	}

	get track() { return this.cabnetService?.selectedTrack() ?? null }

	ngOnInit() {
		this.volumeInput.set(this.track!.volume());
		this.volumeDisplayValue.set(this.track!.volume().toString());

		this.panInput.set(this.track!.pan());
		this.panDisplayValue.set(this.track!.pan().toString());
		
		this.reverbInput.set(this.track!.reverb());
		this.reverbDisplayValue.set(this.track!.reverb().toString());
	}

	// =======================================================================
	// Selector

	onSelect(synthName: string) {
		this.track?.instrument.set(synthName);
	}

	// =======================================================================
	// Volume Control

	volumeInput = signal(this.track?.volume() ?? 0);
	volumeDisplayValue = signal(this.track?.volume().toString() ?? "0");
	updateVolume() {
		this.track!.volume.set(this.volumeInput());
		this.playbackService.updateNodeVolumeMute(this.track!._id, this.volumeInput());
		this.volumeDisplayValue.set(this.volumeInput().toString());
	}
	commitVolumeChange(event: Event) {
		const input = (event.target as HTMLInputElement).value.trim();

		if (input === '') {
			this.volumeInput.set(0);
			this.updateVolume();
			return;
		}

		const parsed = parseFloat(input);
		if (!isNaN(parsed)) {
			const clampedValue = Math.min(100, Math.max(0, Math.round(parsed)));
			this.volumeInput.set(clampedValue);
			this.updateVolume();
		} else {
			this.volumeDisplayValue.set(this.track!.volume().toString());
		}
	}

	// =======================================================================
	// Pan Control

	panInput = signal(this.track?.pan() ?? 0);
	panDisplayValue = signal(this.track?.pan().toString() ?? "0");
	updatePan() {
		this.track!.pan.set(this.panInput());
		this.playbackService.updateNodePan(this.track!._id, this.panInput());
		this.panDisplayValue.set(this.panInput().toString());
	}
	commitPanChange(event: Event) {
		const input = (event.target as HTMLInputElement).value.trim();

		if (input === '') {
			this.panInput.set(0);
			this.updatePan();
			return;
		}

		const parsed = parseFloat(input);
		if (!isNaN(parsed)) {
			const clampedValue = Math.min(100, Math.max(-100, Math.round(parsed)));
			this.panInput.set(clampedValue);
			this.updatePan();
		} else {
			this.panDisplayValue.set(this.track!.pan().toString());
		}
	}

	// =======================================================================
	// Reverb Control

	reverbInput = signal(this.track?.reverb() ?? 0);
	reverbDisplayValue = signal(this.track?.reverb().toString() ?? "0");
	updateReverb() {
		this.track!.reverb.set(this.reverbInput());
		this.playbackService.updateNodeReverb(this.track!._id, this.reverbInput());
		this.reverbDisplayValue.set(this.reverbInput().toString());
	}
	commitReverbChange(event: Event) {
		const input = (event.target as HTMLInputElement).value.trim();

		if (input === '') {
			this.reverbInput.set(0);
			this.updateReverb();
			return;
		}
		
		const parsed = parseFloat(input);
		if (!isNaN(parsed)) {
			const clampedValue = Math.min(100, Math.max(0, Math.round(parsed)));
			this.reverbInput.set(clampedValue);
			this.updateReverb();
		} else {
			this.reverbDisplayValue.set(this.track!.reverb().toString());
		}
	}

	color = computed(() => this.track!.color());
}
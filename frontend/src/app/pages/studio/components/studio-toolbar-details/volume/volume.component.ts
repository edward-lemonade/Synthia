import { ChangeDetectionStrategy, Component, effect, OnInit, signal, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { FormsModule } from '@angular/forms';
import { StateService } from '../../../state/state.service';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule, FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb 
				[(ngModel)]="volumeInput" 
				(blur)="updateVolume()"
				>
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {
	get masterVolume() { return this.stateService.state.studio.masterVolume }

	constructor(public stateService: StateService) {
		this.volumeInput.set(this.masterVolume());
		effect(() => {
			this.volumeInput.set(this.masterVolume());
		})
	}

	volumeInput = signal(100)
	updateVolume() {
		this.masterVolume.set(this.volumeInput());
	}
}
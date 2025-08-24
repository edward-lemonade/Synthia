import { ChangeDetectionStrategy, Component, effect, OnInit, signal, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { ProjectState } from '../../../services/project-state.service';
import { FormsModule } from '@angular/forms';

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
	constructor(public projectState: ProjectState) {
		this.volumeInput.set(projectState.globalsState.masterVolume());
		effect(() => {
			this.volumeInput.set(projectState.globalsState.masterVolume());
		})
	}

	volumeInput = signal(100)
	updateVolume() {
		this.projectState.globalsState.masterVolume.set(this.volumeInput());
	}
}
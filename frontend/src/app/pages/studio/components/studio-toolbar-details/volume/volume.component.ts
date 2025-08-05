import { Component, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { ProjectVarsService } from '../../../services/project-vars.service';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb 
				[value]="masterVolume()" 
				(input)="masterVolume.set($any($event.target).valueAsNumber)"
				>
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {
	masterVolume: WritableSignal<number>;

	constructor(public projectVarsService: ProjectVarsService) {
		this.masterVolume = projectVarsService.masterVolume;
	}

}
import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { StudioService } from '../../../studio.service';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb [value]="masterVolume" >
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {
	constructor(public studioService: StudioService) {}

	get masterVolume(): number { return this.studioService.masterVolume(); } 
	set masterVolume(value: number) { this.studioService.masterVolume.set(value); } 
}
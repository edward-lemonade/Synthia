import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb value="100">
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {}
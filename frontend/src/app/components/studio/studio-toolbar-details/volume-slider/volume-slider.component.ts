import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

@Component({
	selector: 'studio-toolbar-details-volume-slider',
	imports: [MatIcon, MatSliderModule],
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb value="100">
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume-slider.component.scss']
})

export class VolumeSliderComponent {}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatToolbar } from "@angular/material/toolbar";

import { VolumeSliderComponent } from './volume-slider/volume-slider.component';
import { KeySelectComponent } from './key-select/key-select.component';
import { TempoButtonsComponent } from './tempo-buttons/tempo-buttons.component';

@Component({
	selector: 'app-studio-toolbar-details',
	imports: [MatToolbar, CommonModule, VolumeSliderComponent, KeySelectComponent, TempoButtonsComponent],
	template: `
		<mat-toolbar class='toolbar'>
			<studio-toolbar-details-volume-slider></studio-toolbar-details-volume-slider>

			<studio-toolbar-details-key-select></studio-toolbar-details-key-select>

			<studio-toolbar-details-tempo-buttons></studio-toolbar-details-tempo-buttons>
		</mat-toolbar>
	`,
	styleUrls: ['./studio-toolbar-details.component.scss']
})
export class StudioToolbarDetailsComponent {}

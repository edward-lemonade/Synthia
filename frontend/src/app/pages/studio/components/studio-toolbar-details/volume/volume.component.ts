import { Component, OnInit, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { ProjectGlobalsService } from '../../../state/subservices/project-globals.service';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb 
				[value]="masterVolume()" 
				(input)="setMasterVolume($any($event.target).valueAsNumber)"
				>
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {
	constructor(public globalsService: ProjectGlobalsService) {}

	masterVolume(): number { return this.globalsService.get('masterVolume')(); }
	setMasterVolume(v: number) { this.globalsService.set('masterVolume', v); }
}
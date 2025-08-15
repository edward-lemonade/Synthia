import { ChangeDetectionStrategy, Component, OnInit, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { ProjectState, ProjectState_Globals } from '../../../services/project-state.service';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class='volume'>
			<mat-icon class='volume-icon'>volume_up</mat-icon>
			<mat-slider min="0" max="100" step="1">
				<input matSliderThumb 
				[value]="masterVolume" 
				(input)="masterVolume = ($any($event.target).valueAsNumber)"
				>
			</mat-slider>
		</div>
	`,
	styleUrls: ['./volume.component.scss']
})

export class VolumeComponent {
	constructor(public projectState: ProjectState) {}

	get masterVolume(): number { return this.projectState.globalsState.masterVolume(); }
	set masterVolume(v: number) { this.projectState.globalsState.masterVolume.set(v); }
}
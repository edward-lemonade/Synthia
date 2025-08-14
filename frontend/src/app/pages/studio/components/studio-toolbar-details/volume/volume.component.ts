import { ChangeDetectionStrategy, Component, OnInit, WritableSignal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSliderModule } from "@angular/material/slider";

import { GlobalsState } from '../../../state/subservices/globals.state';

@Component({
	selector: 'studio-toolbar-details-volume',
	imports: [MatIcon, MatSliderModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
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
	constructor(public globalsState: GlobalsState) {}

	masterVolume(): number { return this.globalsState.get('masterVolume')(); }
	setMasterVolume(v: number) { this.globalsState.set('masterVolume', v); }
}
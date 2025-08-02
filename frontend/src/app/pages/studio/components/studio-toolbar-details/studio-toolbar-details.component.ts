import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatToolbar } from "@angular/material/toolbar";

import { UndoComponent } from './undo/undo.component';
import { VolumeComponent } from './volume/volume.component';
import { KeyComponent } from './key/key.component';
import { TempoComponent } from './tempo/tempo.component';
import { PlaybackComponent } from './playback/playback.component';
import { TimeComponent } from './time/time.component';

@Component({
	selector: 'app-studio-toolbar-details',
	imports: [MatToolbar, CommonModule, VolumeComponent, KeyComponent, TempoComponent, PlaybackComponent, TimeComponent, UndoComponent],
	template: `
		<mat-toolbar class='toolbar'>
			<studio-toolbar-details-undo></studio-toolbar-details-undo>

			<studio-toolbar-details-volume></studio-toolbar-details-volume>

			<studio-toolbar-details-key></studio-toolbar-details-key>

			<studio-toolbar-details-tempo></studio-toolbar-details-tempo>

			<studio-toolbar-details-playback></studio-toolbar-details-playback>

			<studio-toolbar-details-time></studio-toolbar-details-time>
		</mat-toolbar>
	`,
	styleUrls: ['./studio-toolbar-details.component.scss']
})
export class StudioToolbarDetailsComponent {}

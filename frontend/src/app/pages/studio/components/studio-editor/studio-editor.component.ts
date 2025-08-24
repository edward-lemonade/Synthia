import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Injector, ViewChild, effect, runInInjectionContext } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { TracklistHeaderComponent } from "./tracklist-header/tracklist-header.component";
import { ViewportHeaderComponent } from "./viewport-header/viewport-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { ViewportComponent } from "./viewport/viewport.component";
import { ProjectState } from '../../services/project-state.service';
import { ViewportService } from '../../services/viewport.service';

@Component({
	selector: 'app-studio-editor',
	imports: [MatToolbar, TracklistHeaderComponent, ViewportHeaderComponent, TracklistComponent, ViewportComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-toolbar class="headers">
			<studio-editor-tracklist-header class="container headers-tracklist-container"/>
			<studio-editor-viewport-header class="container headers-viewport-container"/>
		</mat-toolbar>

		<div class="body">
			<studio-editor-tracklist class="container body-tracklist"/>
			<studio-editor-viewport class="container body-viewport"/>
		</div>
	`,
	styleUrl: './studio-editor.component.scss'
})
export class StudioEditorComponent {
	constructor () {}



}

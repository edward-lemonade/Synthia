import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { TracklistHeaderComponent } from "./tracklist-header/tracklist-header.component";
import { ViewportHeaderComponent } from "./viewport-header/viewport-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { ViewportComponent } from "./viewport/viewport.component";

@Component({
	selector: 'app-studio-editor',
	imports: [TracklistHeaderComponent, ViewportHeaderComponent, TracklistComponent, ViewportComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="tracklist">
			<studio-editor-tracklist-header class="container header headers-tracklist"/>
			<studio-editor-tracklist class="container body-tracklist"/>
		</div>

		<div class="viewport">
			<studio-editor-viewport-header class="container header headers-viewport"/>
			<studio-editor-viewport class="container body-viewport"/>
		</div>
	`,
	styleUrl: './studio-editor.component.scss'
})
export class StudioEditorComponent {
	constructor () {}



}

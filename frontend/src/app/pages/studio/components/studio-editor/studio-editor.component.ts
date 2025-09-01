import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbar } from "@angular/material/toolbar";
import { TracklistHeaderComponent } from "./tracklist-header/tracklist-header.component";
import { ViewportHeaderComponent } from "./viewport-header/viewport-header.component";
import { TracklistComponent } from "./tracklist/tracklist.component";
import { ViewportComponent } from "./viewport/viewport.component";
import { PlaybackMarkerComponent } from "./viewport-overlay/playback-marker/playback-marker.component";
import { ViewportOverlayComponent } from "./viewport-overlay/viewport-overlay.component";

@Component({
	selector: 'app-studio-editor',
	imports: [TracklistHeaderComponent, ViewportHeaderComponent, TracklistComponent, ViewportComponent, PlaybackMarkerComponent, ViewportOverlayComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="tracklist">
			<studio-editor-tracklist-header class="header tracklist-header"/>
			<studio-editor-tracklist class="tracklist-body"/>
		</div>

		<div class="viewport">
			<studio-editor-viewport-header class="header viewport-header"/>
			<studio-editor-viewport class="viewport-body"/>
			
			<studio-editor-viewport-overlay/>
		</div>
	`,
	styleUrl: './studio-editor.component.scss'
})
export class StudioEditorComponent {
	constructor () {}



}

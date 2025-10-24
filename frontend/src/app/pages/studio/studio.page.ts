import { Component, OnInit } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';

import { HistoryService } from './services/history.service';
import { StudioEditorComponent } from "./components/studio-editor/studio-editor.component";
import { ViewportService } from './services/viewport.service';
import { RegionSelectService } from './services/region-select.service';
import { RegionDragService } from './services/region-drag.service';
import { AudioCacheService } from './services/audio-cache.service';
import { StateService } from './state/state.service';
import { TracksService } from './services/tracks.service';
import { RegionService } from './services/region.service';
import { TimelinePlaybackService } from './services/timeline-playback.service';
import { StudioCabnetComponent } from "./components/studio-cabnet/studio-cabnet.component";
import { CabnetService } from './services/cabnet.service';
import { AudioRecordingService } from './services/audio-recording.service';
import { TimelineExportService } from './services/timeline-export.service';
import { SynthesizerService } from './services/synthesizer.service';
import { InstantSynthesizerService } from './services/instant-synthesizer.service';
import { LoadingSpinnerComponent } from "@src/app/components/loading-spinner/loading-spinner.component";

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent, StudioEditorComponent, StudioCabnetComponent, LoadingSpinnerComponent],
	providers: [StateService, TracksService, HistoryService, ViewportService, RegionSelectService, RegionService, RegionDragService, AudioCacheService, TimelinePlaybackService, CabnetService, AudioRecordingService, TimelineExportService, SynthesizerService, InstantSynthesizerService],
	standalone: true,
	template: `
		<div class="page-container">
			@if (stateService.isStateReady()) {
				<app-studio-toolbar-top></app-studio-toolbar-top>
				<app-studio-toolbar-details></app-studio-toolbar-details>
				<app-studio-editor></app-studio-editor>
				<app-studio-cabnet/>
			} @else {
				<app-loading-spinner/>
			}
		</div>
	`,
	styles: `
		.page-container {
			display: flex;
			flex-direction: column;
			height: 100vh;
			width: 100%;
		}
	
		app-studio-toolbar-top {
			flex-shrink: 0;
		}

		app-studio-toolbar-details {
			flex-shrink: 0;
		}

		app-studio-editor {
			flex: 1;
		}

		app-studio-cabnet {
			flex-shrink: 0;
		}
	`
})
export class StudioPage implements OnInit {
	sessionId: string = '';

	constructor(
		public stateService: StateService
	) {}

	ngOnInit() {}

}

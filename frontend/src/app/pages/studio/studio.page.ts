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
import { RenderWaveformService } from './services/render-waveform.service';
import { RegionService } from './services/region.service';
import { PlaybackService } from './services/playback.service';
import { StudioCabnetComponent } from "./components/studio-cabnet/studio-cabnet.component";
import { CabnetService } from './services/cabnet.service';
import { RenderMidiService } from './services/render-midi.service';
import { MidiSynthesizerService } from './services/midi-synthesizer.service';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent, StudioEditorComponent, StudioCabnetComponent],
	providers: [StateService, TracksService, HistoryService, AppAuthService, ViewportService, RegionSelectService, RegionService, RegionDragService, AudioCacheService, RenderWaveformService, PlaybackService, CabnetService, RenderMidiService, MidiSynthesizerService],
	template: `
		<div class="page-container">
			@if (stateService.isStateReady()) {
				<app-studio-toolbar-top></app-studio-toolbar-top>
				<app-studio-toolbar-details></app-studio-toolbar-details>
				<app-studio-editor></app-studio-editor>
				<app-studio-cabnet/>
			} @else {
				<div class="loading-container">
					<div class="loading-spinner"></div>
					<p>Loading project...</p>
				</div>
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
		.loading-container {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100vh;
			gap: 1rem;

			.loading-spinner {
				width: 40px;
				height: 40px;
				border: 4px solid #f3f3f3;
				border-top: 4px solid #3498db;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}

			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
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

import { Component, OnInit } from '@angular/core';

import { ProjectState } from './services/project-state.service';

import { AppAuthService } from '@src/app/services/app-auth.service';

import { StudioToolbarTopComponent } from './components/studio-toolbar-top/studio-toolbar-top.component';
import { StudioToolbarDetailsComponent } from './components/studio-toolbar-details/studio-toolbar-details.component';

import { HistoryService } from './services/history.service';
import { StudioEditorComponent } from "./components/studio-editor/studio-editor.component";
import { ZoomScrollService } from './services/zoom-scroll.service';

@Component({
	selector: 'app-studio',
	imports: [StudioToolbarTopComponent, StudioToolbarDetailsComponent, StudioEditorComponent],
	providers: [ProjectState, HistoryService, AppAuthService, ZoomScrollService],
	template: `
		<div class="page-container">
			@if (projectState.isStateReady()) {
				<app-studio-toolbar-top></app-studio-toolbar-top>
				<app-studio-toolbar-details></app-studio-toolbar-details>
				<app-studio-editor></app-studio-editor>
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
			position: absolute;
			height: 100%;
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

	`
})
export class StudioPage implements OnInit {
	sessionId: string = '';

	constructor(
		public projectState: ProjectState
	) {}

	ngOnInit() {}

}

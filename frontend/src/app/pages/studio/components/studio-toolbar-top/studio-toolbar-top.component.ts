import { ChangeDetectionStrategy, Component, OnInit, signal, Signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';

import { SaveButtonComponent } from './save/save-btn.component';
import { ExportButtonComponent } from './export/export-btn.component';
import { PublishButtonComponent } from './publish/publish-btn.component';
import { ShareButtonComponent } from './share/share-btn.component';

import { ProjectState } from '../../services/project-state.service';
import { HistoryService } from '../../services/history.service';
import { MenuButtonComponent } from "./menu/menu-btn.component";

@Component({
	selector: 'app-studio-toolbar-top',
	imports: [MatIcon, MatToolbar, FormsModule, SaveButtonComponent, ExportButtonComponent, PublishButtonComponent, ShareButtonComponent, MenuButtonComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<mat-toolbar class="toolbar">
			<div class="toolbar-section left-section">
				<studio-toolbar-top-menu-btn/>
				<span>NoteFlyte</span>
			</div>

			<div class="toolbar-section center-section">
				<div class="title-container">
					<mat-icon class="title-icon">edit</mat-icon>
					<input 
						class="title-input" 
						placeholder="Untitled" 
						type="text"
						[(ngModel)]="titleInput"
						(input)="updateTitle()">
				</div>
			</div>

			<div class="toolbar-section right-section">
				<p class="saved">{{ isPending() ? "Unsaved changes" : "Saved!"}} </p>
				<studio-toolbar-top-save-btn/>
				<studio-toolbar-top-export-btn/>
				<studio-toolbar-top-publish-btn/>
				<studio-toolbar-top-share-btn/>
			</div>
		</mat-toolbar>
	`,
	styleUrls: ['./studio-toolbar-top.component.scss']
})
export class StudioToolbarTopComponent implements OnInit {
	constructor(
		private projectState: ProjectState,
		private historyService: HistoryService,
	) {}

	ngOnInit() {
		this.titleInput.set(this.projectState.metadataState.title());
	}

	titleInput = signal('')
	updateTitle() {
		this.projectState.metadataState.title.set(this.titleInput());
	}

	isPending(): boolean { return this.historyService.isPending() }
}	

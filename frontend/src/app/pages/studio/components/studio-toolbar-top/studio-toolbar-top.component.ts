import { Component, Signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';

import { SaveComponent } from './save/save.component';
import { ExportComponent } from './export/export.component';
import { PublishComponent } from './publish/publish.component';
import { ShareComponent } from './share/share.component';

import { ProjectMetadataService } from '../../state/subservices/project-metadata.service';
import { ProjectState } from '../../state/project.state';
import { HistoryService } from '../../services/history.service';

@Component({
	selector: 'app-studio-toolbar-top',
	imports: [MatIcon, MatToolbar, FormsModule, SaveComponent, ExportComponent, PublishComponent, ShareComponent],
	template: `
		<mat-toolbar class="toolbar">
			<div class="toolbar-section left-section">
				<button class="menu-btn">
					<mat-icon>menu</mat-icon>
				</button>
				<span>NoteFlyte</span>
			</div>

			<div class="toolbar-section center-section">
				<div class="title-container">
					<mat-icon class="title-icon">edit</mat-icon>
					<input 
						class="title-input" 
						placeholder="Untitled" 
						type="text"
						[value]="title().toString()"
						(input)="setTitle($event)">
				</div>
			</div>

			<div class="toolbar-section right-section">
				<p class="saved">{{ isPending() ? "Unsaved changes" : "Saved!"}} </p>
				<studio-toolbar-top-save/>
				<studio-toolbar-top-export/>
				<studio-toolbar-top-publish/>
				<studio-toolbar-top-share/>
			</div>
		</mat-toolbar>
	`,
	styleUrls: ['./studio-toolbar-top.component.scss']
})
export class StudioToolbarTopComponent {
	constructor(
		private projectMetadataService: ProjectMetadataService,
		private projectState: ProjectState,
		private historyService: HistoryService,
	) {}

	title(): string { return this.projectMetadataService.get("title")(); }
	setTitle(event: Event) { 
		const input = (event.target as HTMLInputElement).value.toString();

		this.projectMetadataService.set("title", input);
		(event.target as HTMLInputElement).value = this.title().toString() 
	}

	isPending(): boolean { return this.historyService.isPending() }
}	

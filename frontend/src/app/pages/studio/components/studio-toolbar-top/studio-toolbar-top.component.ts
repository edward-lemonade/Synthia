import { Component, Signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';

import { SaveComponent } from './save/save.component';
import { ExportComponent } from './export/export.component';
import { PublishComponent } from './publish/publish.component';
import { ShareComponent } from './share/share.component';

import { ProjectMetadataService } from '../../services/project-metadata.service';

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
						[(ngModel)]="title">
				</div>
			</div>

			<div class="toolbar-section right-section">
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
	title: Signal<string>;
	
	constructor(public projectMetadataService: ProjectMetadataService) {
		this.title = this.projectMetadataService.title;
	}

	//get title(): string { return this.projectMetadataService.state.title(); }
	//set title(value: string) { this.projectMetadataService.title.set(value); }
}	

import { Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { FormsModule } from '@angular/forms';

import { StudioService } from '../../studio.service';

@Component({
	selector: 'app-studio-toolbar-top',
	imports: [MatIcon, MatToolbar, FormsModule],
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
				<button class="toolbar-btn save-btn">
					<mat-icon>save</mat-icon>
					Save
				</button>
				<button class="toolbar-btn export-btn">
					<mat-icon>file_download</mat-icon>
					Export
				</button>
				<button class="toolbar-btn publish-btn">
					<mat-icon>cloud_upload</mat-icon>
					Publish
				</button>
				<button class="toolbar-btn share-btn">
					<mat-icon>people</mat-icon>
					Share
				</button>
			</div>
		</mat-toolbar>
	`,
	styleUrls: ['./studio-toolbar-top.component.scss']
})
export class StudioToolbarTopComponent {
	constructor(public studioService: StudioService) {
	}

	get title(): string { return this.studioService.title(); }
	set title(value: string) { this.studioService.title.set(value); }
}	

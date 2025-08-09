import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field'
import { FormsModule } from '@angular/forms';

import { ProjectsService } from '../../projects.service';
import { ProjectMetadata } from '@shared/types';

@Component({
	selector: 'app-projects-list',
	imports: [MatIconModule, MatMenuModule, MatFormFieldModule, FormsModule, MatInputModule],
	template: `
		<div class="projects-grid">
			@for (project of getProjectsList(); track project.projectId; let i = $index) {
				<div class="project-item">		
					@if (renamingProjectId === project.projectId) {
						<!-- Rename mode -->
						<div class="center">
							<input matInput class="rename-input"
								[(ngModel)]="tempProjectName"
								[attr.aria-label]="'Rename ' + project.title"
								(keydown.enter)="onSaveRename(i, project)"
								(keydown.escape)="onCancelRename()">
						
							<button mat-icon-button 
								class="icon-button"
								[attr.aria-label]="'Save rename for ' + project.title"
								(click)="onSaveRename(i, project)">
								<mat-icon>check</mat-icon>
							</button>
							<button mat-icon-button 
								class="icon-button"
								[attr.aria-label]="'Cancel rename for ' + project.title"
								(click)="onCancelRename()">
								<mat-icon>close</mat-icon>
							</button>
							
						</div>
					} @else {
						<!-- Default mode -->
						<p class="project-title">{{ project.title }}</p>

						<div class="center">
							<button mat-icon-button 
								class="icon-button"
								[attr.aria-label]="'Play ' + project.title"
								(click)="onPlayButton(project)">
								<mat-icon>play_arrow</mat-icon>
							</button>
							<button mat-button 
								class="open-button"
								(click)="onOpenButton(project)">
								Studio
							</button>

							<div class="spectrogram-container">
								<div class="spectrogram-placeholder">
									<!-- Spectrogram visualization will be rendered here -->
									<span class="spectrogram-text">Spectrogram</span>
								</div>
							</div>

							<button mat-icon-button 
								class="icon-button"
								[attr.aria-label]="'Settings ' + project.title"
								[matMenuTriggerFor] = "extraSettings"
								(click)="onPlayButton(project)">
								<mat-icon>more_vert</mat-icon>
							</button>
							<mat-menu #extraSettings="matMenu" class="menu">
								<button mat-menu-item class="menuItem" (click)="onRenameButton(project)">
									<mat-icon>edit</mat-icon>
									Rename
								</button>
								<button mat-menu-item class="menuItem" (click)="onDeleteButton(i, project)">
									<mat-icon color="red">delete</mat-icon>
									Delete
								</button>
							</mat-menu>

						</div>
					}
				</div>
			}
		</div>
	`,
	styleUrl: './projects-list.component.scss'
})
export class ProjectsListComponent {

	constructor(
		private projectsService: ProjectsService,
		private cdr: ChangeDetectorRef,
	) {}

	getProjectsList(): ProjectMetadata[] { return this.projectsService.projectsList(); }
	onPlayButton(project: ProjectMetadata) {}
	onOpenButton(project: ProjectMetadata) { this.projectsService.openProject(project) }
	onDeleteButton(i: number, project: ProjectMetadata) { 
		this.projectsService.deleteProject(i, project);
	}

	@ViewChild('renameInput') renameInput!: ElementRef<HTMLInputElement>;
	renamingProjectId: string | null = null;
	tempProjectName: string = '';

	ngAfterViewInit() {
		if (this.renamingProjectId && this.renameInput) {
			setTimeout(() => {
				this.renameInput.nativeElement.focus();
				this.renameInput.nativeElement.select();
			});
		}
	}
	
	onRenameButton(project: ProjectMetadata) {
		console.log(project);
		this.renamingProjectId = project.projectId;
		this.tempProjectName = project.title;
		
		this.cdr.detectChanges();
		setTimeout(() => {
			if (this.renameInput) {
				this.renameInput.nativeElement.focus();
				this.renameInput.nativeElement.select();
			}
		});
	}

	onCancelRename() { 
		this.renamingProjectId = null;
		this.tempProjectName = '';
	}
	onSaveRename(i: number, project: ProjectMetadata) {
		if (this.tempProjectName.trim() && this.tempProjectName.trim() !== project.title) {
			this.projectsService.renameProject(i, project, this.tempProjectName.trim());
		}
		this.renamingProjectId = null;
		this.tempProjectName = '';
	}
}

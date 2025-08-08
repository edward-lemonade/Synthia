import { Component } from '@angular/core';

import { MatList, MatListItem } from "@angular/material/list";
import { MatIconModule } from '@angular/material/icon';

import { ProjectsService } from '../../projects.service';
import { ProjectMetadata } from '@shared/types';

@Component({
	selector: 'app-projects-list',
	imports: [MatIconModule],
	template: `
		<div class="projects-grid">
			@for (project of getProjectsList(); track project.projectId) {
				<div class="project-item">				

						<div class="project-actions">
							<button mat-icon-button 
								class="play-button"
								[attr.aria-label]="'Play ' + project.title"
								(click)="onPlayButton(project)">
								<mat-icon>play_arrow</mat-icon>
							</button>
							<button mat-button 
								class="open-button"
								(click)="onOpenButton(project)">
								Studio
							</button>
						</div>

						<span class="spacer"></span>

						<div class="spectrogram-container">
							<div class="spectrogram-placeholder">
								<!-- Spectrogram visualization will be rendered here -->
								<span class="spectrogram-text">Spectrogram</span>
							</div>
						</div>

						<p class="project-title">{{ project.title }}</p>
				</div>
			}
		</div>
	`,
	styleUrl: './projects-list.component.scss'
})
export class ProjectsListComponent {
	constructor(
		private projectsService: ProjectsService,
	) {}

	getProjectsList(): ProjectMetadata[] { return this.projectsService.projectsList(); }
	onPlayButton(project: ProjectMetadata) {}
	onOpenButton(project: ProjectMetadata) {}
}

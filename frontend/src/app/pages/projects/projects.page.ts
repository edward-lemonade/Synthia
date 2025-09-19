import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectsLayoutComponent } from './components/projects-layout/projects-layout.component';
import { ProjectsListItemComponent } from "./components/projects-list-item/projects-list-item.component";
import { ProjectsService } from './projects.service';
import { ProjectMetadata } from '@shared/types';

@Component({
	selector: 'app-projects',
	standalone: true,
	imports: [RouterModule, ProjectsLayoutComponent, ProjectsListItemComponent],
	providers: [ProjectsService],
	template: `
		<app-projects-layout>
			<div class="projects-grid">
				@for (project of getProjectsList(); track project.projectId; let i = $index) {
					<app-projects-list-item
						[project]="project"
						[index]="i">
					</app-projects-list-item>
				}
			</div>
		</app-projects-layout>
	`,
	styles: [`
		.projects-grid {
			width: auto;
			height: auto;
			overflow-y: auto;
			display: grid;
			grid-template-columns: 1fr;
			grid-auto-rows: min-content;
			gap: 16px;
			align-content: start;

			padding: 20px;
		}
	`]
})
export class ProjectsPage implements OnInit {
	private abortController = new AbortController();
	constructor(private projectsService: ProjectsService) {}

	ngOnInit() {
		this.projectsService.loadProjects(this.abortController.signal);
	}

	getProjectsList(): ProjectMetadata[] { 
		return this.projectsService.projectsList(); 
	}

	ngOnDestroy(): void {
		this.abortController.abort();
	}
}
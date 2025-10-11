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
			@for (project of getProjectsList(); track project.projectId; let i = $index) {
				<app-projects-list-item
					[project]="project"
					[index]="i">
				</app-projects-list-item>
			}
		</app-projects-layout>
	`,
	styles: [``]
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
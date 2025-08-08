import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectsLayoutComponent } from './components/projects-layout/projects-layout.component';
import { ProjectsListComponent } from "./components/projects-list/projects-list.component";

import { ProjectsService } from './projects.service';

@Component({
	selector: 'app-projects',
	imports: [RouterModule, ProjectsLayoutComponent, ProjectsListComponent],
	providers: [ProjectsService],
	template: `
		<app-projects-layout>
			<app-projects-list/>
		</app-projects-layout>
	`,
	styles: ``
})
export class ProjectsPage implements OnInit {
	constructor (
		private projectsService: ProjectsService,
	) {}

	ngOnInit() {
		this.projectsService.loadProjects();
	}
}

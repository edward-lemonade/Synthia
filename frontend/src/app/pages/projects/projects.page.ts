import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProjectsLayoutComponent } from './components/projects-layout/projects-layout.component';


@Component({
	selector: 'app-projects',
	imports: [RouterModule, ProjectsLayoutComponent],
	template: `
		<app-projects-layout>
			<p> BRUHHH </p>
		</app-projects-layout>
	`,
	styles: ``
})
export class ProjectsPage {

}

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProjectsService } from '../../projects.service';

@Component({
	selector: 'app-projects-layout',
	standalone: true,
	imports: [RouterModule, MatSidenavModule, MatListModule, MatButtonModule, MatIconModule],
	template: `
		<mat-sidenav-container class="sidenav-container">
			<mat-sidenav #sidenav mode="side" opened class="sidebar"
				[fixedInViewport]="true" 
				[fixedTopGap]="64" [fixedBottomGap]="0">
				<mat-nav-list >
					<div mat class="sidebar-btn" (click)="newProjectOnClick()">
						<mat-icon>add</mat-icon>	
						New Project
					</div>
				</mat-nav-list>
			</mat-sidenav>
			<mat-sidenav-content class="projects-content">
				<ng-content></ng-content>
			</mat-sidenav-content>
		</mat-sidenav-container>
	`,
	styleUrls: ['./projects-layout.component.scss']
})
export class ProjectsLayoutComponent {
	private projectsService: ProjectsService;

	constructor(projectsService: ProjectsService) {
		this.projectsService = projectsService;
	}

	async newProjectOnClick() {
		this.projectsService.newProject();
	}
} 

/*
<button mat-button class="sidebar-btn" routerLink="/projects/all-projects" routerLinkActive="sidebar-btn-active">
	<mat-icon>folder</mat-icon>
	All Projects
</button>
<button mat-button class="sidebar-btn" routerLink="/projects/my-projects" routerLinkActive="sidebar-btn-active">
	<mat-icon>person</mat-icon>
	My Projects
</button>
<button mat-button class="sidebar-btn" routerLink="/projects/collabs" routerLinkActive="sidebar-btn-active">
	<mat-icon>group</mat-icon>
	Collabs
</button>
<button mat-button class="sidebar-btn" routerLink="/projects/remixes" routerLinkActive="sidebar-btn-active">
	<mat-icon>loop</mat-icon>
	Remixes
</button>

*/
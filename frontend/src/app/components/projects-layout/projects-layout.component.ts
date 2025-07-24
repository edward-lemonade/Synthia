import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

import { COLORS, SPACES } from '../../theme';

@Component({
	selector: 'app-projects-layout',
	standalone: true,
	imports: [RouterModule, MatSidenavModule, MatListModule, MatButtonModule],
	template: `
		<mat-sidenav-container style="height: 100vh;">
			<mat-sidenav mode="side" opened>
				<mat-nav-list class="sidebar">
					<button mat-button class="sidebar-btn" routerLink="/projects/all-projects" routerLinkActive="sidebar-btn-active">All Projects</button>
					<button mat-button class="sidebar-btn" routerLink="/projects/my-projects" routerLinkActive="sidebar-btn-active">My Projects</button>
					<button mat-button class="sidebar-btn" routerLink="/projects/collabs" routerLinkActive="sidebar-btn-active">Collabs</button>
				</mat-nav-list>
			</mat-sidenav>
			<mat-sidenav-content class="projects-content">
				<router-outlet></router-outlet>
			</mat-sidenav-content>
		</mat-sidenav-container>
	`,
	styles: [`
		mat-sidenav { width: 400px; }
		.sidebar {
			display: flex;
			flex-direction: column;
			align-items: flex-start; 
			padding-left: ${SPACES.PAD_ENDS}
		}
	   	.sidebar-btn {
			gap: 8px;
			justify-content: flex-start; 
			text-align: left;

			background: ${COLORS.ACCENT_ORANGE};
			color: ${COLORS.APP_BG};
			transition: background 0.2s;
	
			margin-top: 8px;
			width: 200px;
		}
		.sidebar-btn[routerLinkActive].sidebar-btn-active {
            background: #fff !important;
            font-weight: bold;
        }
		.sidebar-btn:hover {
            background: ${COLORS.ACCENT_ORANGE_L} !important;
        }
		.projects-content {
			background: ${COLORS.APP_BG};
		}
	`]
})
export class ProjectsLayoutComponent {} 
import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

import { HomeComponent } from './pages/home/home.component';
import { ProjectsLayoutComponent } from './components/projects-layout/projects-layout.component';
import { AllProjectsComponent } from './pages/projects/all-projects/all-projects.component';
import { AppbarLayoutComponent } from './components/appbar-layout/appbar-layout.component';
import { StudioComponent } from './pages/studio/studio.component';

export const routes: Routes = [
	{path: '', component: AppbarLayoutComponent, children: [
		{path: '', component: HomeComponent, canActivate: [UnAuthGuard]},
		{path: 'projects', component: ProjectsLayoutComponent, canActivate: [AuthGuard], children: [
			{path: '', redirectTo: 'all-projects', pathMatch: 'full'},
			{path: 'all-projects', component: AllProjectsComponent},
			{path: 'my-projects', redirectTo: 'all-projects', pathMatch: 'full'},
			{path: 'collabs', redirectTo: 'all-projects', pathMatch: 'full'},
			{path: 'remixes', redirectTo: 'all-projects', pathMatch: 'full'},
		]},
	]},
	{path: 'studio/:sessionId', component: StudioComponent, canActivate: [AuthGuard]},
	{path: '**', redirectTo: ''},
];

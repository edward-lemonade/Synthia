import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

import { HomeComponent } from './pages/home/home.component';
import { ProjectsLayoutComponent } from './components/projects-layout/projects-layout.component';
import { AllProjectsComponent } from './pages/projects/all-projects/all-projects.component';

export const routes: Routes = [
	{path: '', component: HomeComponent, canActivate: [UnAuthGuard]},
	{path: 'projects', component: ProjectsLayoutComponent, canActivate: [AuthGuard], children: [
		{path: '', redirectTo: 'all-projects', pathMatch: 'full'},
		{path: 'all-projects', component: AllProjectsComponent},
		{path: 'my-projects', redirectTo: 'all-projects', pathMatch: 'full'},
		{path: 'collab-projects', redirectTo: 'all-projects', pathMatch: 'full'},
	]},
	{path: '**', redirectTo: ''}
];

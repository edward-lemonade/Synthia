import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

import { AppbarLayoutComponent } from './components/appbar-layout/appbar-layout.component';
import { HomePage } from './pages/home/home.page';
import { ProjectsPage } from './pages/projects/projects.page';
import { StudioPage } from './pages/studio/studio.page';
import { provideState } from '@ngrx/store';
import { projectFeature } from './pages/studio/state/state.reducers';

export const routes: Routes = [
	{path: '', component: AppbarLayoutComponent, children: [
		{path: '', component: HomePage, canActivate: [UnAuthGuard]},
		{path: 'projects', component: ProjectsPage, canActivate: [AuthGuard]},
	]},
	{path: 'studio/:projectId', component: StudioPage, canActivate: [AuthGuard], providers: [provideState(projectFeature)]},
	{path: '**', redirectTo: ''},
];

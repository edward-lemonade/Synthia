import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

import { AppbarLayoutComponent } from './components/appbar-layout/appbar-layout.component';
import { HomePage } from './pages/home/home.page';
import { ProjectsPage } from './pages/projects/projects.page';
import { StudioPage } from './pages/studio/studio.page';
import { PublishPage } from './pages/publish/publish.page';
import { TrackPage } from './pages/track/track.page';

export const routes: Routes = [
	{path: '', component: AppbarLayoutComponent, children: [
		{path: '', component: HomePage, canActivate: [UnAuthGuard]},
		{path: 'projects', component: ProjectsPage, canActivate: [AuthGuard]},
		{path: 'publish/:projectId', component: PublishPage, canActivate: [AuthGuard]},
		{path: 'track/:trackId', component: TrackPage, canActivate: [AuthGuard]},
	]},
	{path: 'studio/:projectId', component: StudioPage, canActivate: [AuthGuard]},
	{path: '**', redirectTo: ''},
];

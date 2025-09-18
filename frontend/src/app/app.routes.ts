import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

import { AppbarLayoutComponent } from './components/appbar-layout/appbar-layout.component';
import { HomePage } from './pages/home/home.page';
import { ProjectsPage } from './pages/projects/projects.page';
import { StudioPage } from './pages/studio/studio.page';
import { PublishPage } from './pages/publish/publish.page';
import { TrackPage } from './pages/track/track.page';
import { SettingsPage } from './pages/settings/settings.page';
import { RegistrationPage } from './pages/registration/registration.page';
import { ProfilePage } from './pages/profile/profile.page';
import { DiscoverPage } from './pages/discover/discover.page';

export const routes: Routes = [
	{path: '', component: HomePage, canActivate: [UnAuthGuard]},
	{path: '', component: AppbarLayoutComponent, children: [
		{path: 'projects', component: ProjectsPage, canActivate: [AuthGuard]},
		{path: 'settings', component: SettingsPage, canActivate: [AuthGuard]},
		{path: 'discover', component: DiscoverPage},
		{path: 'publish/:projectId', component: PublishPage, canActivate: [AuthGuard]},
		{path: 'track/:trackId', component: TrackPage},
		{path: 'profile/:displayName', component: ProfilePage},
	]},
	{path: 'registration', component: RegistrationPage, canActivate: [AuthGuard]},
	{path: 'studio/:projectId', component: StudioPage, canActivate: [AuthGuard]},
	{path: '**', redirectTo: ''},
];

import { Routes } from '@angular/router';

import { UnAuthGuard } from './core/guards/un-auth.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{
		path: '',
		loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
		canActivate: [UnAuthGuard],
	},
	{
		path: '',
		loadComponent: () => import('./components/app-layout/app-layout.component').then(m => m.AppLayoutComponent),
		children: [
			{
				path: 'projects',
				loadComponent: () => import('./pages/projects/projects.page').then(m => m.ProjectsPage),
				canActivate: [AuthGuard],
			},
			{
				path: 'settings',
				loadComponent: () => import('./pages/settings/settings.page').then(m => m.SettingsPage),
				canActivate: [AuthGuard],
			},
			{
				path: 'discover',
				loadComponent: () => import('./pages/discover/discover.page').then(m => m.DiscoverPage),
			},
			{
				path: 'publish/:projectId',
				loadComponent: () => import('./pages/publish/publish.page').then(m => m.PublishPage),
				canActivate: [AuthGuard],
			},
			{
				path: 'track/:trackId',
				loadComponent: () => import('./pages/track/track.page').then(m => m.TrackPage),
			},
			{
				path: 'profile/:displayName',
				loadComponent: () => import('./pages/profile/profile.page').then(m => m.ProfilePage),
			},
		],
	},
	{
		path: 'registration',
		loadComponent: () => import('./pages/registration/registration.page').then(m => m.RegistrationPage),
		canActivate: [AuthGuard],
	},
	{
		path: 'studio/:projectId',
		loadComponent: () => import('./pages/studio/studio.page').then(m => m.StudioPage),
	},
	{ path: '**', redirectTo: 'projects' },
];

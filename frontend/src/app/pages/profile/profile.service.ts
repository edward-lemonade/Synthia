import { Injectable, signal } from '@angular/core';
import axios from 'axios';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { User, ProjectReleased } from '@shared/types';

@Injectable()
export class ProfileService {
	constructor(private auth: AppAuthService) {}

	user = signal<User|null>(null);
	projects = signal<ProjectReleased[]>([]);
	isDataLoaded = false;

	async loadProfile(displayName?: string) {
		try {
			const token = await this.auth.getAccessToken();
			const res = await axios.get<{ user: User, projects: ProjectReleased[] }>(
				`/api/profile/${displayName}`,
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			this.user.set(res.data.user);
			this.projects.set(res.data.projects.map(r => ({ 
				front: {...r.front, dateReleased: new Date(r.front.dateReleased) },
				metadata: r.metadata, 
			})));
			this.isDataLoaded = true;
		} catch (err) {
			console.error('Error loading profile:', err);
			this.isDataLoaded = true;
		}
	}
}

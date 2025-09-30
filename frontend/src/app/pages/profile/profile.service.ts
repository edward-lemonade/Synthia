import { Injectable, signal } from '@angular/core';
import axios from 'axios';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { User, ProjectReleased } from '@shared/types';
import { environment } from '@src/environments/environment.dev';
import { ApiService } from '@src/app/services/api.service';

@Injectable()
export class ProfileService {
	constructor(private auth: AppAuthService) {}

	user = signal<User|null>(null);
	projects = signal<ProjectReleased[]>([]);
	isDataLoaded = false;

	async loadProfile(displayName: string, signal: AbortSignal) {
		try {
			const res = await ApiService.instance.routes.getProfile({signal}, displayName);
			
			this.user.set(res.data.user);
			this.projects.set(res.data.projects.map(r => ({ 
				front: {...r.front, dateReleased: new Date(r.front.dateReleased) },
				metadata: r.metadata, 
			})));
			this.isDataLoaded = true;
		} catch (err: any) {
			if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {return;}
			console.error('Error loading profile:', err);
			this.isDataLoaded = true;
		}
	}
}

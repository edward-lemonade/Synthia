import { Injectable, Signal, WritableSignal, signal } from '@angular/core';

import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid'

import axios from 'axios'
import { ProjectMetadata } from '@shared/types';

@Injectable()
export class ProjectsService {
	constructor(
		private auth: AppAuthService,
		private router: Router,
	) {}

	public readonly projectsList: WritableSignal<ProjectMetadata[]> = signal([])

	public async loadProjects() {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUser()
			if (!user) return [] 

			const res = await axios.post<{ projects: ProjectMetadata[] }>(
				'/api/projects/get_mine', 
				{ userId: user.sub },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.projects) {
				this.projectsList.set(res.data.projects);
			}
			return res.data.projects;
		} catch (err) {
			console.error('Error during project creation:', err);
			return [];
		}
	}

	public async newProject() {
		try {
			const token = await this.auth.getAccessToken();

			const res = await axios.post<{ sessionId: string }>(
				'/api/studio/create_session', 
				{},
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.sessionId) {
				this.router.navigate(['/studio', res.data.sessionId], {queryParams: {
					projectId: uuidv4(),
					isNew: true,
				}});
			} 
			console.error('No session!?');
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}

	public async openProject() {
		try {
			const token = await this.auth.getAccessToken();

			const res = await axios.post<{ sessionId: string }>(
				'/api/studio/create_session', 
				{},
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.sessionId) {
				this.router.navigate(['/studio', res.data.sessionId], {queryParams: {
					projectId: uuidv4(),
					isNew: true,
				}});
			} 
			console.error('No session!?');
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}
}
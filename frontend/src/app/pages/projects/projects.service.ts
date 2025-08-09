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
			if (!token) { console.error('No valid token'); return }

			const projectId = uuidv4();
			this.router.navigate(['/studio', projectId], {queryParams: {
				isNew: true,
			}});
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}

	public async openProject(project: ProjectMetadata) {
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { console.error('No valid token'); return }

			this.router.navigate(['/studio', project.projectId], {queryParams: {
				isNew: false,
			}});
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}

	public async deleteProject(index: number, project: ProjectMetadata) {
		this.projectsList.update(projectsList => projectsList.filter((_,i) => i !== index))
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { console.error('No valid token'); return }

			const res = await axios.post<{ success: boolean }>(
				'/api/projects/delete_studio', 
				{ projectId: project.projectId },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			return res.data.success;
		} catch (err) {
			console.error('Error during project creation:', err);
			return false;
		}
	}

	public async renameProject(index: number, project: ProjectMetadata, newName: string) {
		this.projectsList.update(projectsList => {
			projectsList[index] = { ...projectsList[index], title: newName };
			return projectsList;
		});			
		
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { console.error('No valid token'); return }

			const res = await axios.post<{ success: boolean }>(
				'/api/projects/rename', 
				{ projectId: project, newName: newName },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			return res.data.success;
		} catch (err) {
			console.error('Error during project creation:', err);
			return false;
		}
	}
}
// projects.service.ts (enhanced with rename state)
import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { AudioFileData, ProjectMetadata } from '@shared/types';
import { base64ToArrayBuffer, CachedAudioFile, makeCacheAudioFile, makeCacheAudioFileFromPieces } from '@src/app/utils/audio';
import { environment } from '@src/environments/environment.dev';
import { ApiService } from '@src/app/services/api.service';

@Injectable()
export class ProjectsService {
	constructor(
		private auth: AppAuthService,
		private router: Router,
	) {}

	public projectsList: WritableSignal<ProjectMetadata[]> = signal([]);
	public projectExports: Record<string, CachedAudioFile> = {};
	
	// Rename state management
	public renamingProjectId: WritableSignal<string | null> = signal(null);

	public async loadProjects(signal: AbortSignal) {
		try {
			const res = await ApiService.instance.routes.getMyProjects({signal});

			if (res.data.projects) {
				const sortedProjects = res.data.projects.sort((a, b) => 
					new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
				);
				
				this.projectsList.set(sortedProjects);
				sortedProjects.forEach((projectMetadata) => {
					this.loadExport(projectMetadata.projectId, signal);
				});
			}
			return res.data.projects;
		} catch (err: any) {
			if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {return [];}
			console.error('Error during project loading:', err);
			return [];
		}
	}

	public async loadExport(projectId: string, signal: AbortSignal) {
		try {
			const [bufferRes, waveformRes] = await Promise.all([
				ApiService.instance.routes.getMyProjectExport({responseType: "text", signal}, projectId),
				ApiService.instance.routes.getMyProjectWaveform({signal}, projectId)
			]);

			if (bufferRes && waveformRes) {
				const cachedExportData = await makeCacheAudioFileFromPieces(bufferRes.data, waveformRes.data.waveformData);
				this.projectExports[projectId] = cachedExportData;
			}
			return bufferRes.data;
		} catch (err: any) {
			if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {return [];}
			console.error('Error during export loading:', err);
			return [];
		}
	}

	public async getExport(projectId: string, timeoutMs: number = 30000) {
		const startTime = Date.now();
		
		while (Date.now() - startTime < timeoutMs) {
			const exportData = this.projectExports[projectId];
			if (exportData !== undefined) {
				return exportData;
			}
			
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		throw new Error(`Export for project ${projectId} not available after ${timeoutMs}ms timeout`);
	}

	public async newProject() {
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { console.error('No valid token'); return; }

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
			if (!token) { console.error('No valid token'); return; }

			this.router.navigate(['/studio', project.projectId], {queryParams: {
				isNew: false,
			}});
		} catch (err) {
			console.error('Error during project opening:', err);
		}
	}

	public async publishProject(project: ProjectMetadata) {
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { console.error('No valid token'); return; }

			this.router.navigate(['/publish', project.projectId]);
		} catch (err) {
			console.error('Error navigating to publish page:', err);
		}
	}

	public async deleteProject(index: number, project: ProjectMetadata) {
		this.projectsList.update(projectsList => projectsList.filter((_,i) => i !== index));
		try {
			const res = await ApiService.instance.routes.deleteStudio({}, project.projectId);
			return res.data.success;
		} catch (err) {
			console.error('Error during project deletion:', err);
			return false;
		}
	}

	public startRename(project: ProjectMetadata) {
		this.renamingProjectId.set(project.projectId);
	}
	public cancelRename() {
		this.renamingProjectId.set(null);
	}
	public async renameProject(index: number, project: ProjectMetadata, newName: string) {
		// Optimistic update
		this.projectsList.update(projectsList => {
			projectsList[index] = { ...projectsList[index], title: newName };
			return [...projectsList];
		});
		
		// Clear rename state
		this.renamingProjectId.set(null);
		
		try {
			const res = await ApiService.instance.routes.renameProject({
				data: { newName: newName }
			}, project.projectId);

			if (!res.data.success) {
				// Revert optimistic update on server error
				this.projectsList.update(projectsList => {
					projectsList[index] = { ...projectsList[index], title: project.title };
					return [...projectsList];
				});
			}

			return res.data.success;
		} catch (err) {
			console.error('Error during project rename:', err);
			// Revert optimistic update on error
			this.projectsList.update(projectsList => {
				projectsList[index] = { ...projectsList[index], title: project.title };
				return [...projectsList];
			});
			return false;
		}
	}

	public isRenaming(projectId: string): boolean {
		return this.renamingProjectId() === projectId;
	}
}
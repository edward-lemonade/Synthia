// projects.service.ts (enhanced with rename state)
import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { AudioFileData, ProjectFront, ProjectMetadata } from '@shared/types';
import { base64ToArrayBuffer, CachedAudioFile, makeCacheAudioFile } from '@src/app/utils/audio';

@Injectable()
export class PublishService {
	constructor(
		private auth: AppAuthService,
		private router: Router,
	) {}

	declare projectMetadata: ProjectMetadata;
	declare projectFront: ProjectFront;
	declare cachedAudioFile: CachedAudioFile;

	public async loadProject(projectId: string) {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;

			const res = await axios.post<{ project: ProjectMetadata }>(
				'/api/projects/get_project', 
				{ userId: user.sub, projectId: projectId},
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.project) {
				this.projectMetadata = res.data.project;
				this.loadExport(projectId);
			}
			return res.data.project;
		} catch (err) {
			console.error('Error during project loading:', err);
			return null;
		}
	}

	public async loadExport(projectId: string) {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;

			const res = await axios.post<{ exportFileData: AudioFileData }>(
				'/api/projects/get_export', 
				{ projectId: projectId },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			const exportFileData = res.data.exportFileData;
			if (exportFileData) {
				const cachedExportData = await makeCacheAudioFile(exportFileData);
				this.cachedAudioFile = cachedExportData;
				return cachedExportData;
			}
			return exportFileData;
		} catch (err) {
			console.error('Error during export loading:', err);
			return null;
		}
	}

	public async getExport(timeoutMs: number = 30000) {
		const startTime = Date.now();
		
		while (Date.now() - startTime < timeoutMs) {
			const exportData = this.cachedAudioFile;
			if (exportData !== undefined) {
				return exportData;
			}
			
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		
		throw new Error(`Export for project not available after ${timeoutMs}ms timeout`);
	}

	// =========================================================
	// Update

	public async loadFront() {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user || !this.projectMetadata?.projectId) return null;

			const res = await axios.post<{ projectFront: any }>(
				'/api/projects/get_front', 
				{ projectId: this.projectMetadata.projectId },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			this.projectFront = res.data.projectFront;

			return res.data.projectFront?.description || '';
		} catch (err) {
			console.error('Error loading project front:', err);
			return null;
		}
	}

	public async getExistingDescription() {
		return this.projectFront?.description || '';
	}

	public async renameProject(project: ProjectMetadata, newName: string) {
		try {
			const token = await this.auth.getAccessToken();
			if (!token) { 
				console.error('No valid token');
				this.projectMetadata = { ...project, title: project.title };
				return false;
			}

			const res = await axios.post<{ success: boolean }>(
				'/api/projects/rename', 
				{ projectId: project.projectId, newName: newName },
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			return res.data.success;
		} catch (err) {
			console.error('Error during project rename:', err);

			return false;
		}
	}

	// =========================================================
	// Actions

	public async publishProject(description: string, title?: string) {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;

			if (title && title !== this.projectMetadata.title) {
				const renameSuccess = await this.renameProject(this.projectMetadata, title);
				if (!renameSuccess) {
					console.error('Failed to update project title');
					return false;
				}
				this.projectMetadata = { ...this.projectMetadata, title: title };
			}

			const res = await axios.post<{ success: boolean }>(
				'/api/projects/publish', 
				{ 
					userId: user.sub, 
					projectId: this.projectMetadata.projectId,
					description: description,
				},
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.success) {
				this.projectMetadata = { ...this.projectMetadata, isReleased: true };
				this.router.navigate(['/track', this.projectMetadata.projectId]);
			}
			return true;
		} catch (err) {
			console.error('Error during project publishing:', err);
			return false;
		}
	}

	public async unpublishProject() {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;

			const res = await axios.post<{ success: boolean }>(
				'/api/projects/unpublish', 
				{ 
					projectId: this.projectMetadata.projectId,
				},
				{ headers: {Authorization: `Bearer ${token}`}}
			);

			if (res.data.success) {
				this.projectMetadata = { ...this.projectMetadata, isReleased: false };
				this.router.navigate(['/projects']);
			}
			return res.data.success;
		} catch (err) {
			console.error('Error during project unpublishing:', err);
			return false;
		}
	}
}
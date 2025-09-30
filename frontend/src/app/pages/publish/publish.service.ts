// projects.service.ts (enhanced with rename state)
import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { AudioFileData, ProjectFront, ProjectMetadata } from '@shared/types';
import { base64ToArrayBuffer, CachedAudioFile, makeCacheAudioFile } from '@src/app/utils/audio';
import { environment } from '@src/environments/environment.dev';
import { ApiService } from '@src/app/services/api.service';

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
			const res = await ApiService.instance.routes.getMyProject({}, projectId);

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
			const res = await ApiService.instance.routes.getMyProjectExport({}, projectId);

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
			const res = await ApiService.instance.routes.getMyProjectFront({}, this.projectMetadata!.projectId);

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
			let res = null;
			if (project.isReleased) {
				res = await ApiService.instance.routes.renameProjectFront({data: {newName}}, project.projectId);
			} else {
				res = await ApiService.instance.routes.renameProject({data: {newName}}, project.projectId);
			}

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
			if (title && title !== this.projectMetadata.title) {
				const renameSuccess = await this.renameProject(this.projectMetadata, title);
				if (!renameSuccess) {
					console.error('Failed to update project title');
					return false;
				}
				this.projectMetadata = { ...this.projectMetadata, title: title };
			}

			const res = await ApiService.instance.routes.publishProject({data: {
				title: title,
				description: description,
			}}, this.projectMetadata.projectId);

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

			const res = await ApiService.instance.routes.unpublishProject({}, this.projectMetadata.projectId);

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
// projects.service.ts (enhanced with secure user interactions)
import { Injectable, Signal, WritableSignal, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { AudioFileData, Comment, CommentDTO, fillDates, InteractionState, ProjectFront, ProjectFrontDTO, ProjectMetadata } from '@shared/types';
import { base64ToArrayBuffer, CachedAudioFile, makeCacheAudioFile } from '@src/app/utils/audio';
import { UserService } from '@src/app/services/user.service';
import { AuthService } from '@auth0/auth0-angular';


@Injectable()
export class TrackService {
	constructor(
		private auth: AuthService,
		private appAuthService: AppAuthService,
		private userService: UserService,
		private router: Router,
	) {
		this.auth.isAuthenticated$.subscribe(isAuth => {this.isGuestUser = !isAuth;});
	}

	projectMetadata = signal<ProjectMetadata|null>(null);
	projectFront = signal<ProjectFront|null>(null);
	cachedAudioFile = signal<CachedAudioFile|null>(null);
	isDataLoaded = false;
	isAudioLoaded = false;

	comments = signal<Comment[]>([])

	declare interactionState: InteractionState;
	hasLiked = signal(false);
	likes = signal(0);

	isGuestUser = true;

	public async loadTrack(projectId: string) {
		try {
			const headers = await this.appAuthService.getAuthHeaders();

			const res = await axios.get<{ metadata: ProjectMetadata, front: ProjectFrontDTO, comments: CommentDTO[], interactionState: InteractionState }>(
				`/api/track/${projectId}/data`, 
				{ headers }
			);

			if (res.data.metadata && res.data.front) {
				this.projectMetadata.set(res.data.metadata);
				this.projectFront.set({...res.data.front, dateReleased: new Date(res.data.front.dateReleased)});
				this.interactionState = res.data.interactionState || false;

				this.comments.set(
					res.data.comments.map(comment => (fillDates(comment)))
				);

				this.likes.set(res.data.front.likes);
				this.hasLiked.set(this.interactionState.hasLiked);
				this.isDataLoaded = true;
			}
			return res.data.metadata;
		} catch (err) {
			console.error('Error during project loading:', err);
			return null;
		}
	}

	public async loadAudio(projectId: string) {
		try {
			const headers = await this.appAuthService.getAuthHeaders();

			const res = await axios.get<{ audioFileData: AudioFileData }>(
				`/api/track/${projectId}/audio`, 
				{ headers }
			);

			const audioFileData = res.data.audioFileData;
			if (audioFileData) {
				const cachedExportData = await makeCacheAudioFile(audioFileData);
				this.cachedAudioFile.set(cachedExportData);
				this.isAudioLoaded = true;
				return cachedExportData;
			}
			return null;
		} catch (err) {
			console.error('Error during export loading:', err);
			return null;
		}
	}

	public async getAudio(timeoutMs: number = 30000) {
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

	// =============================================================
	// User Interactions

	public async leaveComment(comment: string): Promise<Comment|null> {
		if (this.isGuestUser) {return null};

		try {
			if (!comment || comment.trim().length === 0) {return null;}
		
			const token = await this.appAuthService.getAccessToken();
			const user = this.appAuthService.getUserAuth();
			if (!user) return null;

			const res = await axios.post<{ success: boolean, newComment: CommentDTO }>(
				`/api/track/${this.projectMetadata()!.projectId}/comment`, 
				{
					comment: comment.trim(),
					timestamp: Date.now()
				},
				{ headers: { Authorization: `Bearer ${token}` }}
			);
			
			const newComment = {...fillDates(res.data.newComment), profilePictureURL: this.userService.user()?.profilePictureURL};
			this.comments.update(curr => [newComment, ...curr])

			return newComment;
		} catch (err) {
			console.error('Error leaving comment:', err);
			return null;
		}
	}

	public async toggleLike(): Promise<boolean> {
		if (this.isGuestUser) {return true};

		try {
			const token = await this.appAuthService.getAccessToken();
			const user = this.appAuthService.getUserAuth();
			if (!user) return false;

			const res = await axios.post<{ success: boolean, isLiked: boolean }>(
				`/api/track/${this.projectMetadata()!.projectId}/toggle_like`, 
				{},
				{ headers: { Authorization: `Bearer ${token}` }}
			);

			if (res.data.success) {
				console.log(res.data)
				if (res.data.isLiked) {
					this.likes.update(v => v+1);
					this.hasLiked.set(true);
				} else {
					this.likes.update(v => v-1);
					this.hasLiked.set(false);
				}
				return true;
			}
			return false;
		} catch (err) {
			console.error('Error toggling like:', err);
			return false;
		}
	}

	public async recordPlay(): Promise<boolean> {
		if (this.isGuestUser) {return false};

		try {
			const token = await this.appAuthService.getAccessToken();
			const user = this.appAuthService.getUserAuth();
			if (!user) return false;

			const now = Date.now();

			const res = await axios.post<{ success: boolean }>(
				`/api/track/${this.projectMetadata()!.projectId}/record_play`, 
				{ 
					timestamp: now
				},
				{ headers: { Authorization: `Bearer ${token}` }}
			);

			if (res.data.success) {
				return true;
			}
			return false;
		} catch (err) {
			console.error('Error recording play:', err);
			return false;
		}
	}
}
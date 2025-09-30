import { Injectable, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { AudioFileData, Comment, CommentDTO, fillDates, InteractionState, ProjectFront, ProjectFrontDTO, ProjectMetadata, WaveformData } from '@shared/types';
import { UserService } from '@src/app/services/user.service';
import { AuthService } from '@auth0/auth0-angular';
import { ApiService } from '@src/app/services/api.service';
import { environment } from '@src/environments/environment.dev';

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

	projectId: string|null = null;
	projectMetadata = signal<ProjectMetadata|null>(null);
	projectFront = signal<ProjectFront|null>(null);
	isDataLoaded = signal(false);

	waveformData = signal<WaveformData|null>(null);
	audioDuration = signal<number>(0);
	isWaveformLoaded = signal(false);

	comments = signal<Comment[]>([]);

	declare interactionState: InteractionState;
	hasLiked = signal(false);
	likes = signal(0);

	isGuestUser = true;

	public async loadTrack(projectId: string, signal: AbortSignal) {
		try {
			const res = await ApiService.instance.routes.getTrack({signal}, projectId);
			
			if (res.data.metadata && res.data.front) {
				this.projectMetadata.set(res.data.metadata);
				this.projectFront.set({...res.data.front, dateReleased: new Date(res.data.front.dateReleased)});
				this.interactionState = res.data.interactionState || false;

				this.comments.set(
					res.data.comments.map(comment => (fillDates(comment)))
				);

				this.likes.set(res.data.front.likes);
				this.hasLiked.set(this.interactionState.hasLiked);
				this.isDataLoaded.set(true);
			}
			return res.data.metadata;
		} catch (err: any) {
			if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {return null;}
			console.error('Error during project loading:', err);
			return null;
		}
	}

	public async loadWaveform(projectId: string, signal: AbortSignal) {
		try {
			const res = await ApiService.instance.routes.getTrackWaveform({signal}, projectId);

			if (res.data.waveformData) {
				this.waveformData.set(res.data.waveformData);
				this.isWaveformLoaded.set(true);
			}
			return res.data.waveformData;
		} catch (err: any) {
			if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {return null;}
			console.error('Error during waveform loading:', err);
			return null;
		}
	}

	public getStreamUrl(): string { return `${environment.API_URL}/api/track/${this.projectId!}/stream`; }
	public getDownloadUrl(): string { return `${environment.API_URL}/api/track/${this.projectId!}/download`; }

	// =============================================================
	// User Interactions

	public async leaveComment(comment: string): Promise<Comment|null> {
		if (this.isGuestUser) {return null};

		try {
			if (!comment || comment.trim().length === 0) {return null;}

			const res = await ApiService.instance.routes.postComment({data: {
				comment: comment.trim(),
				timestamp: Date.now(),
			}}, this.projectId!);
			
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
			const res = await ApiService.instance.routes.toggleLike({}, this.projectId!);

			if (res.data.success) {
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
			const now = Date.now();
			const res = await ApiService.instance.routes.recordPlay({data: {timestamp: now}}, this.projectId!);

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
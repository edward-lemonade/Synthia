// projects.service.ts (enhanced with secure user interactions)
import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { UserService } from '@src/app/services/user.service';
import { ProjectReleased, RelevantProjectOrUser, User } from '@shared/types';

export enum ListMode { New, Hot, Search }

@Injectable()
export class DiscoverService {
	constructor(
		private auth: AppAuthService,
		private userService: UserService,
		private router: Router,
	) {}

	listMode = signal<ListMode>(0);
	isLoadingMore = signal<boolean>(false);

	BATCH_SIZE = 7;
	reachedEnd = false;

	projectsAndUsers = signal<RelevantProjectOrUser[]>([])
	getLast = computed(() => {
		const length = this.projectsAndUsers().length;
		if (length) {
			return this.projectsAndUsers()[length-1];
		} else {
			return undefined;
		}
	})

	// hotness paginator
	lastHotness = 0;

	// search paginator
	lastScore = 0;
	lastProjectId = '';
	lastUserId = '';

	searchTerm = signal<string>('');

	async getMoreItems(reset?: boolean) {
		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;
			
			if (reset) { this.projectsAndUsers.set([]); }
			
			if (this.listMode() == ListMode.Search) {
				const res = await axios.post<{ 
					success: boolean, 
					results: RelevantProjectOrUser[], 
					lastScore: number,
					lastProjectId: string,
					lastUserId: string,
					reachedEnd: boolean,
				}>(
					`/api/tracks/search`, 
					{
						amount: this.BATCH_SIZE,
						lastScore: this.lastScore,
						lastProjectId: this.lastProjectId,
						lastUserId: this.lastUserId, 
						searchTerm: this.searchTerm(),
					},
					{ headers: {Authorization: `Bearer ${token}`}},
				);
				this.lastScore = res.data.lastScore;
				this.lastProjectId = res.data.lastProjectId;
				this.lastUserId = res.data.lastUserId;

				const data = res!.data;
				this.reachedEnd = data.reachedEnd;

				if (reset) {
					this.projectsAndUsers.set(data.results);
				} else {
					this.projectsAndUsers.update((curr) => [...curr, ...data.results]);
				}
				return data.results;
			} else {
				let res = null;

				if (this.listMode() == ListMode.New) {
					res = await axios.post<{ success: boolean, projects: ProjectReleased[], reachedEnd: boolean }>(
						`/api/tracks/newest`, 
						{
							amount: this.BATCH_SIZE,
							lastReleaseDate: (this.getLast() as ProjectReleased)?.front.dateReleased,
							lastProjectId: (this.getLast() as ProjectReleased)?.metadata.projectId,
						},
						{ headers: {Authorization: `Bearer ${token}`}},
					);
				} else if (this.listMode() == ListMode.Hot) {
					res = await axios.post<{ success: boolean, projects: ProjectReleased[], lastHotness: number, reachedEnd: boolean }>(
						`/api/tracks/hottest`, 
						{
							amount: this.BATCH_SIZE,
							lastHotness: this.lastHotness,
							lastProjectId: (this.getLast() as ProjectReleased)?.metadata.projectId,
						},
						{ headers: {Authorization: `Bearer ${token}`}},
					);
					this.lastHotness = res.data.lastHotness;
				}
				const data = res!.data;
				this.reachedEnd = data.reachedEnd;

				if (reset) {
					this.projectsAndUsers.set(data.projects);
				} else {
					this.projectsAndUsers.update((curr) => [...curr, ...data.projects]);
				}
				return data.projects;
			}
		} catch (err) {
			console.error('Error during project loading:', err);

			return null;
		}
	}

}
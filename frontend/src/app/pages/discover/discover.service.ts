// projects.service.ts (enhanced with secure user interactions)
import { Injectable, Signal, WritableSignal, computed, signal } from '@angular/core';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import axios from 'axios';
import { UserService } from '@src/app/services/user.service';
import { ProjectReleased } from '@shared/types';


@Injectable()
export class DiscoverService {
	constructor(
		private auth: AppAuthService,
		private userService: UserService,
		private router: Router,
	) {}

	projects = signal<ProjectReleased[]>([]);

	batchSize = 20;
	reachedEnd = false;
	getLast = computed(() => {
		const length = this.projects().length;
		if (length) {
			return this.projects()[length-1];
		} else {
			return undefined;
		}
	})

	async getMoreTracks() {
		if (this.reachedEnd) return;

		try {
			const token = await this.auth.getAccessToken();
			const user = this.auth.getUserAuth();
			if (!user) return null;

			const res = await axios.post<{ success: boolean, projects: ProjectReleased[], reachedEnd: boolean }>(
				`/api/tracks/newest`, 
				{
					amount: this.batchSize,
					lastReleaseDate: this.getLast()?.front.dateReleased,
					lastProjectId: this.getLast()?.metadata.projectId,
				},
				{ headers: {Authorization: `Bearer ${token}`}},
			);

			this.reachedEnd = res.data.reachedEnd;
			this.projects.update((curr) => [...curr, ...res.data.projects]);

			return res.data.projects;
		} catch (err) {
			console.error('Error during project loading:', err);
			return null;
		}
	}

}
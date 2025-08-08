import { Injectable } from '@angular/core';

import { AppAuthService } from '@src/app/services/app-auth.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid'

import axios from 'axios'

@Injectable()
export class ProjectsService {
	constructor(
		private auth: AppAuthService,
		private router: Router,
	) {}

	public async newProject() {
		try {
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');

			const res = await axios.post<{ sessionId: string }>(
				'/api/studio/create_session', 
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (res.data.sessionId) {
				console.log('Redirecting to studio with sessionId:', res.data.sessionId);
				this.router.navigate(['/studio', res.data.sessionId], {queryParams: {
					projectId: uuidv4(),
					isNew: true,
				}});
			} 
		} catch (err) {
			console.error('Error during project creation:', err);
		}
	}
}
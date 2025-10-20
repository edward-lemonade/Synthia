import { computed, Injectable, signal, inject } from '@angular/core';
import { AudioFileData, Author, Comment, CommentDTO, InteractionState, ProjectFront, ProjectMetadata, ProjectReleased, ProjectState, RelevantProjectOrUser, User, WaveformData } from '@shared/types';
import { AppAuthService } from './app-auth.service';
import axios, { AxiosResponse } from 'axios';
import { environment } from '@src/environments/environment.dev';

@Injectable({ providedIn: 'root' })
export class ApiService {
	private static _instance: ApiService;
	static get instance(): ApiService { return ApiService._instance; }

	constructor(
		private auth: AppAuthService
	) {
		ApiService._instance = this;
	}

	// ====================================================================================
	// API Calls

	routes = {
		getMe: 					
			(params: any = {}) => {return this.callApi<{user: User|null, isNew: boolean}>(`/me`, 'get', params, true)},
		createMe: 				
			(params: any = {}) => {return this.callApi<{user: User|null, isNew: boolean}>(`/me`, 'post', params)},
		updateProfile: 			
			(params: any = {}) => {return this.callApi<{ user: User }>(`/me/profile`, 'put', params, true)},
		updateProfilePicture: 	
			(params: any = {}) => {return this.callApi<{ success: boolean, profilePictureURL: string }>(`/me/profile_picture`, 'put', params, true)},
		
		getProfile: 			
			(params: any = {}, displayName: string) => {return this.callApi<{user: User, projects: ProjectReleased[]}>(`/profile/${displayName}`, 'get', params)},

		getMyProjects:
			(params: any = {}) => {return this.callApi<{projects: ProjectMetadata[]}>(`/projects/all`, 'get', params, true)},
		getMyProject:
			(params: any = {}, projectId: string) => {return this.callApi<{project: ProjectMetadata}>(`/projects/${projectId}`, 'get', params, true)},
		saveStudioNew:
			(params: any = {}) => {return this.callApi<{success: boolean}>(`/projects/save_new`, 'post', params, true)},
		saveStudioOverwrite:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/projects/${projectId}/studio`, 'post', params, true)},
		getStudio:
			(params: any = {}, projectId: string) => {return this.callApi<{state: ProjectState}>(`/projects/${projectId}/studio`, 'get', params, true)},
		deleteStudio:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/projects/${projectId}/studio`, 'delete', params, true)},
		renameProject:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/projects/${projectId}/rename`, 'patch', params, true)},
		renameProjectFront:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/projects/${projectId}/rename_front`, 'patch', params, true)},
		getMyProjectExport:
			(params: any = {}, projectId: string) => {return this.callApi<string>(`/projects/${projectId}/export`, 'get', {...params, responseType: "text"}, true)},
		getMyProjectWaveform:
			(params: any = {}, projectId: string) => {return this.callApi<{
				success: boolean, 
				waveformData: WaveformData,
			}>(`/projects/${projectId}/waveform`, 'get', params)},
		getMyProjectFront:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean, projectFront: ProjectFront}>(`/projects/${projectId}/front`, 'get', params, true)},
		publishProject:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean, projectFront: ProjectFront}>(`/projects/${projectId}/front`, 'post', params, true)},
		unpublishProject:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/projects/${projectId}/front`, 'delete', params, true)},


		saveProjectFiles:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean, count: number}>(`/projects/${projectId}/files/save`, 'post', params, true)},
		loadProjectFiles:
			(params: any = {}, projectId: string) => {return this.callApi<AudioFileData[]>(`/projects/${projectId}/files/get_all`, 'post', {...params, responseType: "json"}, true)},

		streamTrack: 
			(params: any = {}, projectId: string) => {return this.callApi<{bytes: Buffer[]}>(`/track/${projectId}/stream`, 'get', params)},
		downloadTrack: 
			(params: any = {}, projectId: string) => {return this.callApi<Blob>(`/track/${projectId}/download`, 'get', params)},
		getTrack:
			(params: any = {}, projectId: string) => {return this.callApi<{
				success: boolean, 
				metadata: ProjectMetadata, 
				front: ProjectFront,
				comments: CommentDTO[],
				interactionState: InteractionState,
			}>(`/track/${projectId}/data`, 'get', params)},
		getTrackWaveform:
			(params: any = {}, projectId: string) => {return this.callApi<{
				success: boolean, 
				waveformData: WaveformData,
			}>(`/track/${projectId}/waveform`, 'get', params)},
		getTrackAudio:
			(params: any = {}, projectId: string) => {return this.callApi<{
				success: boolean, 
				audioFileData: AudioFileData
			}>(`/track/${projectId}/audio`, 'get', params)},
		postComment:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean, newComment: CommentDTO}>(`/track/${projectId}/comment`, 'post', params, true)},
		toggleLike:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean, isLiked: boolean}>(`/track/${projectId}/toggle_like`, 'post', params, true)},
		recordPlay:
			(params: any = {}, projectId: string) => {return this.callApi<{success: boolean}>(`/track/${projectId}/record_play`, 'post', params, true)},
		getNewestTracks:
			(params: any = {}) => {return this.callApi<{
				success: boolean,
				projects: RelevantProjectOrUser[],
				reachedEnd: boolean,
			}>(`/tracks/newest`, 'post', params)},
		getHottestTracks:
			(params: any = {}) => {return this.callApi<{
				success: boolean,
				projects: RelevantProjectOrUser[],
				lastHotness: number,
				reachedEnd: boolean,
			}>(`/tracks/hottest`, 'post', params)},
		search:
			(params: any = {}) => {return this.callApi<{
				success: true,
				results: RelevantProjectOrUser[],
				lastScore: number,
				lastProjectId: string,
				lastUserId: string,
				reachedEnd: boolean,
			}>(`/search`, 'post', params)},
	}
	
	async callApi<ResType>(
		apiEndpoint: string, 
		method: 'get'|'post'|'put'|'patch'|'delete', 
		params: {
			responseType?: "blob"|"arraybuffer"|"document"|"json"|"text"|"stream",
			headers?: {[key: string]: string},
			data?: any, 
			signal?: AbortSignal
		},
		needAuth: boolean = false
	): Promise<AxiosResponse<ResType>> {
		//console.log(`${environment.API_URL}/api${apiEndpoint}`, params.data)

		if (needAuth) {
			await this.auth.waitForAuthCheck();
		}
		let headers = await this.auth.getAuthHeaders();
		if (needAuth && !headers) {
			throw new Error('Not logged in!');
		}
		headers = headers ?? {}

		//console.log(`${environment.API_URL}/api${apiEndpoint}`, params.data, { headers: {...headers, ...params.headers}, signal: params.signal });
	
		let res;
		if (method === 'post' || method === 'put' || method === 'patch') {
			res = await axios[method]<ResType>(
				`${environment.API_URL}/api${apiEndpoint}`, 
				params.data,
				{ headers: {...headers, ...params.headers}, signal: params.signal },
			);
		} else {
			res = await axios[method]<ResType>(
				`${environment.API_URL}/api${apiEndpoint}`, 
				{ headers: {...headers, ...params.headers}, signal: params.signal },
			);
		}
		
		return res;
		
	}
	
}

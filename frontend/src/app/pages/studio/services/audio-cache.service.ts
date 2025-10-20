import { Injectable, signal, computed } from '@angular/core';
import { AudioFileRef, AudioFileData, Region, RegionType } from '@shared/types';
import { StateService } from '../state/state.service';
import { HttpClient } from '@angular/common/http';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Base64 } from 'js-base64'
import axios from 'axios';
import { arrayBufferToBase64, base64ToArrayBuffer, CachedAudioFile, fileToArrayBuffer, makeCacheAudioFile } from '@src/app/utils/audio';
import { WaveformData } from '@shared/types';
import { environment } from '@src/environments/environment.dev';
import { ApiService } from '@src/app/services/api.service';
import { UserService } from '@src/app/services/user.service';

const AUDIO_SESSION_STORAGE_KEY = 'synthia_guest_audio_files';

@Injectable()
export class AudioCacheService {
	private static _instance: AudioCacheService;
	static get instance(): AudioCacheService { return AudioCacheService._instance; }

	get audioFileRefs() { return StateService.instance.state.studio.fileRefs };
	public cache = new Map<string, CachedAudioFile>(); // fileId -> cached audio file

	public isReady = false;
	public ready: Promise<void>;
 	private readyResolve!: () => void;

	constructor(
		private auth: AppAuthService,
		private userService: UserService,
	) {
		AudioCacheService._instance = this;

		this.ready = new Promise<void>(resolve => {
			this.readyResolve = resolve;
		});
	}

	public async initialize() { // will be called from StateService after state is ready and initialized
		if (this.isReady) return;
		this.cache.clear();

		const user = await this.userService.waitForUser();
		const isSignedOut = !user;

		try {
			if (isSignedOut || StateService.instance.hasSessionStorageData) {
				// Load from sessionStorage for guest users
				const sessionFiles = this.loadAudioFilesFromSessionStorage();
				if (sessionFiles.length > 0) {
					console.log("Loading audio files from sessionStorage: ", sessionFiles.length);
					await Promise.all(
						sessionFiles.map(file => this.cacheAudioFile(file))
					);
				}
			} else {
				// Load from backend for authenticated users
				const fileRefs = this.audioFileRefs();
				const res = await ApiService.instance.routes.loadProjectFiles({data: {fileRefs}}, StateService.instance.projectId!);

				if (res.data) {				
					const uncachedFiles: AudioFileData[] = res.data;
					
					console.log("Got files from backend: ", uncachedFiles.length, uncachedFiles);
					await Promise.all(
						uncachedFiles.map(file => this.cacheAudioFile(file))
					);
				} else {
					console.error("FAILED retrieving files from backend.");
				}
			}

			this.isReady = true;
			this.readyResolve();
		} catch (err) {
			throw err;
		}
	}

	// ==============================================================
	// SessionStorage Methods

	private saveAudioFilesToSessionStorage(audioFileDatas: AudioFileData[]): void {
		try {
			const existing = this.loadAudioFilesFromSessionStorage();
			const updated = [...existing, ...audioFileDatas];
			sessionStorage.setItem(AUDIO_SESSION_STORAGE_KEY, JSON.stringify(updated));
			console.log('Audio files saved to sessionStorage:', audioFileDatas.length);
		} catch (error) {
			console.error('Failed to save audio files to sessionStorage:', error);
		}
	}

	private loadAudioFilesFromSessionStorage(): AudioFileData[] {
		try {
			const stored = sessionStorage.getItem(AUDIO_SESSION_STORAGE_KEY);
			if (stored) {
				const files = JSON.parse(stored) as AudioFileData[];
				console.log('Audio files loaded from sessionStorage:', files.length);
				return files;
			}
		} catch (error) {
			console.error('Failed to load audio files from sessionStorage:', error);
		}
		return [];
	}

	private clearAudioSessionStorage(): void {
		try {
			sessionStorage.removeItem(AUDIO_SESSION_STORAGE_KEY);
			console.log('Audio sessionStorage cleared');
		} catch (error) {
			console.error('Failed to clear audio sessionStorage:', error);
		}
	}

	// ==============================================================
	// Sync Method (called when user logs in with session data)

	public async syncSessionAudioFilesToBackend(): Promise<boolean> {
		const sessionFiles = this.loadAudioFilesFromSessionStorage();
		if (sessionFiles.length === 0) {
			return true;
		}

		try {
			const formData = new FormData();
			
			// Convert stored audio data back to blobs and add to form data
			for (const fileData of sessionFiles) {
				const arrayBuffer = base64ToArrayBuffer(fileData.buffer64);
				const blob = new Blob([arrayBuffer], { type: fileData.mimeType });
				formData.append("files", blob);
				formData.append("fileIds", fileData.fileId);
			}

			const projectId = StateService.instance.projectId!;
			formData.append("projectId", projectId);

			const res = await ApiService.instance.routes.saveProjectFiles({
				headers: {"Content-Type": "multipart/form-data"},
				data: formData
			}, projectId);

			if (res.data.success) {
				console.log('Successfully synced session audio files to backend:', sessionFiles.length);
				this.clearAudioSessionStorage();
				return true;
			} else {
				throw Error("Error syncing audio files to backend");
			}
		} catch (err) {
			console.error('Failed to sync session audio files:', err);
			throw err;
		}
	}

	// ==============================================================
	// Cache insertions

	public async addAudioFiles(files: FileList | File[]): Promise<CachedAudioFile[]> {
		const fileArray = Array.from(files);
		const user = await this.userService.waitForUser();
		const isSignedOut = !user;

		const results = await Promise.all(fileArray.map(async file => {
			const arrayBuffer = await fileToArrayBuffer(file);
			const format = file.type;
			const fileId = this.generateFileId();

			const audioFileRef: AudioFileRef = {
				fileId,
				mimeType: format,
				type: RegionType.Audio,
			};
			const audioFileData: AudioFileData = {
				fileId,
				mimeType: format,
				buffer64: arrayBufferToBase64(arrayBuffer),
			};
			const cachedAudioFile: CachedAudioFile = await this.cacheAudioFile(audioFileData);

			return {
				audioFileRef: audioFileRef,
				audioFileData: audioFileData,
				cachedAudioFile: cachedAudioFile,
			};
		}));

		const audioFileRefs = results.map(r => r.audioFileRef);
		const audioFileDatas = results.map(r => r.audioFileData);
		const cachedAudioFiles = results.map(r => r.cachedAudioFile);			

		try {
			if (isSignedOut) {
				// Save to sessionStorage for guest users
				this.saveAudioFilesToSessionStorage(audioFileDatas);
				this.audioFileRefs.update(files => [...files, ...audioFileRefs]);
				console.log('Audio files stored in sessionStorage for guest user');
				return cachedAudioFiles;
			} else {
				// Save to backend for authenticated users
				const formData = new FormData();
				cachedAudioFiles.forEach((file, i) => {
					formData.append("files", file.blob);
					formData.append("fileIds", audioFileDatas[i].fileId);
				});

				const projectId = StateService.instance.projectId!;
				formData.append("projectId", projectId);

				const res = await ApiService.instance.routes.saveProjectFiles({
					headers: {"Content-Type": "multipart/form-data"},
					data: formData
				}, projectId);

				if (res.data.success) {
					this.audioFileRefs.update(files => [...files, ...audioFileRefs]);
					return cachedAudioFiles;
				} else {
					throw Error("Error saving audio file to backend");
				}
			}
		} catch (err) {
			throw err;
		}
	}

	public async addAudioFile(file: File): Promise<CachedAudioFile> {
		const audioFileRefs = await this.addAudioFiles([file]);
		return audioFileRefs[0];
	}

	public async cacheAudioFile(audioFileData: AudioFileData): Promise<CachedAudioFile> {
		const cachedFile = await makeCacheAudioFile(audioFileData);
		this.cache.set(audioFileData.fileId, cachedFile);
		return cachedFile;
	}

	// ==============================================================
	// Cache queries

	public getCachedAudioFile(fileId: string): CachedAudioFile | undefined {
		return this.cache.get(fileId);
	}
	public clearCache() {
		for (const cached of this.cache.values()) {
			URL.revokeObjectURL(cached.url);
		}
		this.cache.clear();
	}

	// ==============================================================
	// Accessors

	public getWaveformData(fileId: string): WaveformData | null {
		return this.cache.get(fileId)?.waveformData ?? null;
	};

	public getAudioBuffer(fileId: string): AudioBuffer | undefined {
		return this.cache.get(fileId)?.audioBuffer;
	}

	// ==============================================================
	// Helpers

	private generateFileId(): string {
		return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}
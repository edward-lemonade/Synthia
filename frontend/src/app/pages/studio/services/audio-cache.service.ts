import { Injectable, signal, computed } from '@angular/core';
import { AudioFileRef, AudioFileData, Region, RegionType } from '@shared/types';
import { StateService } from '../state/state.service';
import { HttpClient } from '@angular/common/http';
import { AppAuthService } from '@src/app/services/app-auth.service';
import { Base64 } from 'js-base64'
import axios from 'axios';

export interface WaveformData {
	duration: number;
	sampleRate: number;
	channels: number;
	peaks: Float32Array;
}

export interface CachedAudioFile {
	fileId: string;
	buffer: ArrayBuffer;
	blob: Blob;
	url: string;

	duration: number;
	waveformData: WaveformData;
}

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
	) {
		AudioCacheService._instance = this;

		this.ready = new Promise<void>(resolve => {
			this.readyResolve = resolve;
		});
	}

	public async initialize() { // will be called from StateService after state is ready and initialized
		if (this.isReady) return;
		this.cache.clear();

		try {
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');

			const projectId = StateService.instance.projectId;
			const fileRefs = this.audioFileRefs();

			const res = await axios.post<{ success: boolean, audioFileDatas: AudioFileData[] }>(
				'/api/project_files/load', 
				{
					projectId: projectId, 
					fileRefs: fileRefs,
				},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (res.data.success) {				
				const uncachedFiles: AudioFileData[] = res.data.audioFileDatas;

				await Promise.all(
					uncachedFiles.map(file => this.cacheAudioFile(file))
				);
				this.isReady = true;
				this.readyResolve();
			} else {
				console.error("FAILED retrieving files from backend.")
			}
			return res.data.success;
		} catch (err) {
			throw err;
		}
	}

	// ==============================================================
	// Cache insertions

	public async addAudioFiles(files: FileList | File[]): Promise<CachedAudioFile[]> {
		const fileArray = Array.from(files);

		const results = await Promise.all(fileArray.map(async file => {
			const arrayBuffer = await this.fileToArrayBuffer(file);
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
				buffer64: this.arrayBufferToBase64(arrayBuffer),
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
			const token = await this.auth.getAccessToken();
			console.log('Got JWT token:', token ? 'Token received' : 'No token');

			const formData = new FormData();
			cachedAudioFiles.forEach((file, i) => {
				formData.append("files", file.blob);
				formData.append("fileIds", audioFileDatas[i].fileId);
			});

			const projectId = StateService.instance.projectId!;
			formData.append("projectId", projectId);

			const res = await axios.post<{ success: boolean, audioFileDatas: AudioFileData[] }>(
				'/api/project_files/save', 
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
						Authorization: `Bearer ${token}`
					}
				}
			);

			if (res.data.success) {
				 // only leave persistent reference if everything succeeds
				this.audioFileRefs.update(files => [...files, ...audioFileRefs]);

				return cachedAudioFiles;
			} else {
				throw Error("Error saving audio file to backend");
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
		const arrayBuffer = this.base64ToArrayBuffer(audioFileData.buffer64);
		const blob = new Blob([arrayBuffer], { type: audioFileData.mimeType });
		const url = URL.createObjectURL(blob);
		const waveformData = await this.generateAudioWaveform(arrayBuffer);

		const cachedFile: CachedAudioFile = {
			fileId: audioFileData.fileId,
			buffer: arrayBuffer,
			blob,
			url,
			duration: waveformData.duration,
			waveformData,
		};

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
	// Waveform

	public getWaveformData(fileId: string): WaveformData | null {
		return this.cache.get(fileId)?.waveformData ?? null;
	};

	async generateAudioWaveform(audioBuffer: ArrayBuffer): Promise<WaveformData> {
        const audioContext = new AudioContext();
        const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
        
        // Generate peaks at high resolution (we'll downsample for display)
        const peaks = this.extractPeaks(decodedBuffer, 8192); // High resolution base
        
        const waveformData: WaveformData = {
            peaks,
            sampleRate: decodedBuffer.sampleRate,
            duration: decodedBuffer.duration,
            channels: decodedBuffer.numberOfChannels
        };

        return waveformData;
    }

	private extractPeaks(audioBuffer: AudioBuffer, targetLength: number): Float32Array {
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const blockSize = Math.floor(channelData.length / targetLength);
        const peaks = new Float32Array(targetLength);

        for (let i = 0; i < targetLength; i++) {
            const start = i * blockSize;
            const end = Math.min(start + blockSize, channelData.length);
            let max = 0;

            for (let j = start; j < end; j++) {
                max = Math.max(max, Math.abs(channelData[j]));
            }
            peaks[i] = max;
        }

        return peaks;
    }

	// ==============================================================
	// Helpers

	private fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as ArrayBuffer);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(file);
		});
	}

	private generateFileId(): string {
		return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
	
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		return Base64.fromUint8Array(bytes);
	}

	private base64ToArrayBuffer(base64: string): ArrayBuffer {
		const bytes = Base64.toUint8Array(base64);
		return bytes.buffer as ArrayBuffer;
	}
}
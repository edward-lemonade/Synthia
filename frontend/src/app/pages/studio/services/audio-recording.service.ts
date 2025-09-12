import { Injectable, signal } from '@angular/core';
import { AudioCacheService } from './audio-cache.service';
import { RegionSelectService } from './region-select.service';
import { Track } from '@shared/types';
import { ObjectStateNode } from '../state/state.factory';

export interface AudioRecording {
	blob: Blob;
	duration: number;
	mimeType: string;
}

@Injectable()
export class AudioRecordingService {
	private static _instance: AudioRecordingService;
	static get instance(): AudioRecordingService { return AudioRecordingService._instance; }

	// Signals for reactive state management
	isRecording = signal(false);
	isProcessing = signal(false);
	lastRecording = signal<AudioRecording | null>(null);
	recordingTrack = signal<ObjectStateNode<Track> | null>(null);

	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private startTime = 0;
	private stream: MediaStream | null = null;
	private recordingPromise: Promise<AudioRecording> | null = null;
	private recordingResolve: ((value: AudioRecording) => void) | null = null;

	constructor() {
		AudioRecordingService._instance = this;
	}

	async startRecording(): Promise<void> {
		if (this.isRecording()) {
			throw new Error('Already recording');
		}

		this.recordingTrack.set(RegionSelectService.instance.selectedTrack());
		try {
			// Request microphone access
			this.stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 44100
				}
			});

			// Create promise to await recording completion
			this.recordingPromise = new Promise<AudioRecording>((resolve) => {
				this.recordingResolve = resolve;
			});

			// Determine the best supported MIME type
			const mimeType = this.getSupportedMimeType();
			
			this.mediaRecorder = new MediaRecorder(this.stream, {
				mimeType: mimeType
			});

			this.audioChunks = [];
			this.startTime = Date.now();

			// Handle data availability
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};

			// Handle recording stop
			this.mediaRecorder.onstop = async () => {
				await this.processRecordedAudio();
				this.releaseMediaStream();
			};

			// Handle errors
			this.mediaRecorder.onerror = (event) => {
				console.error('MediaRecorder error:', event);
				this.isRecording.set(false);
				this.releaseMediaStream();
				throw new Error('MediaRecorder error occurred');
			};

			// Start recording
			this.mediaRecorder.start(100); // Collect data every 100ms
			this.isRecording.set(true);

		} catch (error) {
			console.error('Error starting recording:', error);
			this.releaseMediaStream();
			this.isRecording.set(false);
			throw error;
		}
	}

	async stopRecording(): Promise<AudioRecording> {
		if (!this.isRecording() || !this.mediaRecorder) {
			throw new Error('Not currently recording');
		}

		if (this.mediaRecorder.state !== 'inactive') {
			this.mediaRecorder.stop();
			this.isRecording.set(false);
		}

		// Wait for the recording promise to resolve
		if (this.recordingPromise) {
			return await this.recordingPromise;
		}

		throw new Error('Recording promise not found');
	}

	private async processRecordedAudio(): Promise<void> {
		this.isProcessing.set(true);

		try {
			const duration = (Date.now() - this.startTime) / 1000;
			const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
			
			const audioBlob = new Blob(this.audioChunks, { type: mimeType });
			
			const recordingData: AudioRecording = {
				blob: audioBlob,
				duration: duration,
				mimeType: mimeType
			};

			// Update signal with the new recording
			this.lastRecording.set(recordingData);

			// Convert to file and add to cache
			const recordingFile = this.recordingToFile(recordingData);
			await AudioCacheService.instance.addAudioFile(recordingFile);

			// Resolve the recording promise
			if (this.recordingResolve) {
				this.recordingResolve(recordingData);
				this.recordingResolve = null;
				this.recordingPromise = null;
			}

		} catch (error) {
			console.error('Error processing recorded audio:', error);
			throw error;
		} finally {
			this.isProcessing.set(false);
		}
	}

	private getSupportedMimeType(): string {
		const mimeTypes = [
			'audio/webm;codecs=opus',
			'audio/webm',
			'audio/mp4',
			'audio/wav'
		];

		for (const mimeType of mimeTypes) {
			if (MediaRecorder.isTypeSupported(mimeType)) {
				return mimeType;
			}
		}

		return 'audio/webm'; // Fallback
	}

	private getFileExtension(mimeType: string): string {
		const mimeMap: { [key: string]: string } = {
			'audio/webm': 'webm',
			'audio/mp4': 'mp4',
			'audio/wav': 'wav',
			'audio/mpeg': 'mp3'
		};

		// Extract base MIME type (remove codecs)
		const baseMimeType = mimeType.split(';')[0];
		return mimeMap[baseMimeType] || 'webm';
	}

	// Release media stream resources
	private releaseMediaStream(): void {
		if (this.stream) {
			this.stream.getTracks().forEach(track => track.stop());
			this.stream = null;
		}
	}

	recordingToFile(recording: AudioRecording): File {
		const extension = this.getFileExtension(recording.mimeType);
		const filename = `recording-${Date.now()}.${extension}`;
		
		return new File([recording.blob], filename, {
			type: recording.mimeType,
			lastModified: Date.now()
		});
	}

	// Check if browser supports audio recording
	isSupported(): boolean {
		return !!(navigator.mediaDevices && window.MediaRecorder);
	}

	destroy(): void {
		if (this.isRecording()) {
			this.stopRecording().catch(console.error);
		}
		this.releaseMediaStream();
	}
}
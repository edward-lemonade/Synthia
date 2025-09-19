import { Injectable, signal } from '@angular/core';
import { AudioCacheService } from './audio-cache.service';
import { RegionSelectService } from './region-select.service';
import { Track } from '@shared/types';
import { ObjectStateNode } from '../state/state.factory';

import 'lamejs/lame.min.js';
declare const lamejs: any;

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

			this.recordingPromise = new Promise<AudioRecording>((resolve) => {
				this.recordingResolve = resolve;
			});

			const mimeType = this.getSupportedMimeType();
			this.mediaRecorder = new MediaRecorder(this.stream, {
				mimeType: mimeType
			});

			console.log(mimeType);

			this.audioChunks = [];
			this.startTime = Date.now();

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};
			this.mediaRecorder.onstop = async () => {
				await this.processRecordedAudio();
				this.releaseMediaStream();
			};
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

	private async convertToMp3(audioBlob: Blob): Promise<Blob> { // gotta convert recordings to mp3 because backend can't handle webp
		try {
			const arrayBuffer = await audioBlob.arrayBuffer();
			
			// Decoding should work for any format
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0)); // slice() creates a copy
			
			const left = audioBuffer.getChannelData(0);
			const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;
			
			// Convert float32 samples to 16-bit PCM
			const leftInt16 = new Int16Array(left.length);
			const rightInt16 = new Int16Array(right.length);
			
			for (let i = 0; i < left.length; i++) {
				leftInt16[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
				rightInt16[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
			}
			
			// Initialize MP3 encoder
			const channels = audioBuffer.numberOfChannels;
			const sampleRate = audioBuffer.sampleRate;
			const bitRate = 128; // 128 kbps
			
			const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);
			const mp3Data: BlobPart[] = [];
			
			// Encode
			const sampleBlockSize = 1152; // MP3 frame size
			
			for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
				const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
				const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
				
				const mp3buf = channels === 1 
					? mp3encoder.encodeBuffer(leftChunk)
					: mp3encoder.encodeBuffer(leftChunk, rightChunk);
					
				if (mp3buf.length > 0) {
					mp3Data.push(mp3buf);
				}
			}
			
			// Flush encoder
			const mp3buf = mp3encoder.flush();
			if (mp3buf.length > 0) {
				mp3Data.push(mp3buf);
			}
			
			// Create blob
			return new Blob(mp3Data, { type: 'audio/mp3' });
			
		} catch (error) {
			console.error('Error converting to MP3:', error);
			throw new Error(`Failed to convert audio to MP3: ${error}`);
		}
	}

	private async processRecordedAudio(): Promise<void> {
		this.isProcessing.set(true);

		try {
			const duration = (Date.now() - this.startTime) / 1000;
			const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
			
			const audioBlob = new Blob(this.audioChunks, { type: mimeType });
			const mp3Blob = await this.convertToMp3(audioBlob);
			
			const recordingData: AudioRecording = {
				blob: mp3Blob,
				duration: duration,
				mimeType: 'audio/mp3'
			};

			this.lastRecording.set(recordingData);

			const recordingFile = this.recordingToFile(recordingData);
			await AudioCacheService.instance.addAudioFile(recordingFile);

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
			'audio/wav',
			'audio/mpeg',
			'audio/mp4',
			'audio/webm',
			'audio/webm;codecs=opus',
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
			'audio/mpeg': 'mp3',
		};

		// Extract base MIME type (remove codecs)
		const baseMimeType = mimeType.split(';')[0];
		return mimeMap[baseMimeType] || 'webm';
	}

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
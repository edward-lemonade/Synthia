import { Injectable, signal, computed } from '@angular/core';
import { Region } from '@shared/types';

export interface AudioFile {
	id: string;
	name: string;
	file: File;
	blob: Blob;
	duration: number;
	sampleRate: number;
	channels: number;
	createdAt: Date;
}

export interface AudioStream {
	audioBuffer: AudioBuffer;
	audioContext: AudioContext;
	source: AudioBufferSourceNode | null;
	isPlaying: boolean;
	startTime: number;
	pauseTime: number;
}

@Injectable({
	providedIn: 'root'
})
export class AudioHandlerService {
	private readonly audioFiles = signal<Map<string, AudioFile>>(new Map());
	private readonly audioContext = signal<AudioContext | null>(null);
	private readonly activeStreams = signal<Map<string, AudioStream>>(new Map());
	private readonly dbName = 'NoteFlyteAudioDB';
	private readonly storeName = 'audioFiles';
	private db: IDBDatabase | null = null;

	// Public signals
	readonly files = computed(() => Array.from(this.audioFiles().values()));
	readonly filesCount = computed(() => this.audioFiles().size);
	readonly isInitialized = signal(false);

	constructor() {
		this.initializeAudioContext();
		this.initializeDatabase();
	}

	/**
	 * Initialize the Web Audio Context
	 */
	private initializeAudioContext(): void {
		try {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			const context = new AudioContextClass();
			this.audioContext.set(context);
		} catch (error) {
			console.error('Failed to initialize AudioContext:', error);
		}
	}

	/**
	 * Initialize IndexedDB for persistent storage
	 */
	private async initializeDatabase(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, 1);

			request.onerror = () => {
				console.error('Failed to open IndexedDB');
				reject(new Error('Failed to open IndexedDB'));
			};

			request.onsuccess = () => {
				this.db = request.result;
				this.loadStoredFiles();
				this.isInitialized.set(true);
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(this.storeName)) {
					const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
					store.createIndex('name', 'name', { unique: false });
					store.createIndex('createdAt', 'createdAt', { unique: false });
				}
			};
		});
	}

	/**
	 * Load stored audio files from IndexedDB
	 */
	private async loadStoredFiles(): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], 'readonly');
			const store = transaction.objectStore(this.storeName);
			const request = store.getAll();

			request.onsuccess = () => {
				const storedFiles = request.result;
				const filesMap = new Map<string, AudioFile>();

				storedFiles.forEach((storedFile: any) => {
					// Convert stored data back to AudioFile format
					const audioFile: AudioFile = {
						id: storedFile.id,
						name: storedFile.name,
						file: storedFile.file,
						blob: storedFile.blob,
						duration: storedFile.duration,
						sampleRate: storedFile.sampleRate,
						channels: storedFile.channels,
						createdAt: new Date(storedFile.createdAt)
					};
					filesMap.set(audioFile.id, audioFile);
				});

				this.audioFiles.set(filesMap);
				resolve();
			};

			request.onerror = () => {
				console.error('Failed to load stored files');
				reject(new Error('Failed to load stored files'));
			};
		});
	}

	/**
	 * Add an audio file to storage
	 */
	async addAudioFile(file: File): Promise<AudioFile> {
		if (!this.audioContext()) {
			throw new Error('AudioContext not initialized');
		}

		// Generate unique ID
		const id = this.generateId();
		
		// Convert file to blob
		const blob = new Blob([file], { type: file.type });
		
		// Get audio metadata
		const audioBuffer = await this.fileToAudioBuffer(file);
		
		// Create audio file object
		const audioFile: AudioFile = {
			id,
			name: file.name,
			file,
			blob,
			duration: audioBuffer.duration,
			sampleRate: audioBuffer.sampleRate,
			channels: audioBuffer.numberOfChannels,
			createdAt: new Date()
		};

		// Store in memory
		const filesMap = new Map(this.audioFiles());
		filesMap.set(id, audioFile);
		this.audioFiles.set(filesMap);

		// Store in IndexedDB
		await this.storeInDatabase(audioFile);

		return audioFile;
	}

	/**
	 * Convert File to AudioBuffer
	 */
	private async fileToAudioBuffer(file: File): Promise<AudioBuffer> {
		const context = this.audioContext();
		if (!context) {
			throw new Error('AudioContext not available');
		}

		const arrayBuffer = await file.arrayBuffer();
		return await context.decodeAudioData(arrayBuffer);
	}

	/**
	 * Store audio file in IndexedDB
	 */
	private async storeInDatabase(audioFile: AudioFile): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([this.storeName], 'readwrite');
			const store = transaction.objectStore(this.storeName);
			const request = store.put(audioFile);

			request.onsuccess = () => resolve();
			request.onerror = () => {
				console.error('Failed to store audio file in database');
				reject(new Error('Failed to store audio file'));
			};
		});
	}

	/**
	 * Get audio file by ID
	 */
	getAudioFile(id: string): AudioFile | undefined {
		return this.audioFiles().get(id);
	}

	/**
	 * Get audio file by name
	 */
	getAudioFileByName(name: string): AudioFile | undefined {
		return Array.from(this.audioFiles().values()).find(file => file.name === name);
	}

	/**
	 * Remove audio file from storage
	 */
	async removeAudioFile(id: string): Promise<void> {
		// Remove from memory
		const filesMap = new Map(this.audioFiles());
		filesMap.delete(id);
		this.audioFiles.set(filesMap);

		// Stop any active streams
		this.stopStream(id);

		// Remove from IndexedDB
		if (this.db) {
			return new Promise((resolve, reject) => {
				const transaction = this.db!.transaction([this.storeName], 'readwrite');
				const store = transaction.objectStore(this.storeName);
				const request = store.delete(id);

				request.onsuccess = () => resolve();
				request.onerror = () => {
					console.error('Failed to remove audio file from database');
					reject(new Error('Failed to remove audio file'));
				};
			});
		}
	}

	/**
	 * Create an audio stream for playback
	 */
	async createStream(audioFileId: string): Promise<AudioStream> {
		const audioFile = this.getAudioFile(audioFileId);
		if (!audioFile) {
			throw new Error(`Audio file with ID ${audioFileId} not found`);
		}

		const context = this.audioContext();
		if (!context) {
			throw new Error('AudioContext not available');
		}

		// Decode audio data
		const arrayBuffer = await audioFile.blob.arrayBuffer();
		const audioBuffer = await context.decodeAudioData(arrayBuffer);

		// Create stream
		const stream: AudioStream = {
			audioBuffer,
			audioContext: context,
			source: null,
			isPlaying: false,
			startTime: 0,
			pauseTime: 0
		};

		// Store stream
		const streamsMap = new Map(this.activeStreams());
		streamsMap.set(audioFileId, stream);
		this.activeStreams.set(streamsMap);

		return stream;
	}

	/**
	 * Play audio stream
	 */
	playStream(audioFileId: string, startTime: number = 0): void {
		const stream = this.activeStreams().get(audioFileId);
		if (!stream) {
			console.error(`No stream found for audio file ${audioFileId}`);
			return;
		}

		if (stream.isPlaying) {
			this.stopStream(audioFileId);
		}

		// Create new source
		stream.source = stream.audioContext.createBufferSource();
		stream.source.buffer = stream.audioBuffer;
		stream.source.connect(stream.audioContext.destination);

		// Set playback position
		const playStartTime = startTime || stream.pauseTime;
		stream.startTime = stream.audioContext.currentTime - playStartTime;
		stream.source.start(0, playStartTime);

		stream.isPlaying = true;

		// Handle playback end
		stream.source.onended = () => {
			stream.isPlaying = false;
			stream.pauseTime = 0;
		};
	}

	/**
	 * Pause audio stream
	 */
	pauseStream(audioFileId: string): void {
		const stream = this.activeStreams().get(audioFileId);
		if (!stream || !stream.isPlaying) return;

		if (stream.source) {
			stream.source.stop();
			stream.pauseTime = stream.audioContext.currentTime - stream.startTime;
		}

		stream.isPlaying = false;
	}

	/**
	 * Stop audio stream
	 */
	stopStream(audioFileId: string): void {
		const stream = this.activeStreams().get(audioFileId);
		if (!stream) return;

		if (stream.source) {
			stream.source.stop();
		}

		stream.isPlaying = false;
		stream.pauseTime = 0;

		// Remove stream
		const streamsMap = new Map(this.activeStreams());
		streamsMap.delete(audioFileId);
		this.activeStreams.set(streamsMap);
	}

	/**
	 * Get current playback time for a stream
	 */
	getStreamTime(audioFileId: string): number {
		const stream = this.activeStreams().get(audioFileId);
		if (!stream) return 0;

		if (stream.isPlaying) {
			return stream.audioContext.currentTime - stream.startTime;
		} else {
			return stream.pauseTime;
		}
	}

	/**
	 * Check if a stream is playing
	 */
	isStreamPlaying(audioFileId: string): boolean {
		const stream = this.activeStreams().get(audioFileId);
		return stream?.isPlaying || false;
	}

	/**
	 * Get audio data for a specific time range (useful for waveform visualization)
	 */
	async getAudioData(audioFileId: string, startTime: number, duration: number): Promise<Float32Array[]> {
		const audioFile = this.getAudioFile(audioFileId);
		if (!audioFile) {
			throw new Error(`Audio file with ID ${audioFileId} not found`);
		}

		const context = this.audioContext();
		if (!context) {
			throw new Error('AudioContext not available');
		}

		// Decode audio data
		const arrayBuffer = await audioFile.blob.arrayBuffer();
		const audioBuffer = await context.decodeAudioData(arrayBuffer);

		// Extract data for the specified time range
		const startSample = Math.floor(startTime * audioBuffer.sampleRate);
		const endSample = Math.floor((startTime + duration) * audioBuffer.sampleRate);
		const samplesCount = endSample - startSample;

		const channels: Float32Array[] = [];
		for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
			const channelData = audioBuffer.getChannelData(channel);
			const segmentData = new Float32Array(samplesCount);
			segmentData.set(channelData.subarray(startSample, endSample));
			channels.push(segmentData);
		}

		return channels;
	}

	/**
	 * Get waveform data for visualization
	 */
	async getWaveformData(audioFileId: string, resolution: number = 1000): Promise<number[]> {
		const audioFile = this.getAudioFile(audioFileId);
		if (!audioFile) {
			throw new Error(`Audio file with ID ${audioFileId} not found`);
		}

		const context = this.audioContext();
		if (!context) {
			throw new Error('AudioContext not available');
		}

		// Decode audio data
		const arrayBuffer = await audioFile.blob.arrayBuffer();
		const audioBuffer = await context.decodeAudioData(arrayBuffer);

		// Get first channel data
		const channelData = audioBuffer.getChannelData(0);
		const samplesPerPoint = Math.floor(channelData.length / resolution);
		const waveform: number[] = [];

		for (let i = 0; i < resolution; i++) {
			const start = i * samplesPerPoint;
			const end = Math.min(start + samplesPerPoint, channelData.length);
			let sum = 0;
			let max = 0;

			for (let j = start; j < end; j++) {
				sum += Math.abs(channelData[j]);
				max = Math.max(max, Math.abs(channelData[j]));
			}

			// Use RMS (Root Mean Square) for better representation
			const rms = Math.sqrt(sum / (end - start));
			waveform.push(rms);
		}

		return waveform;
	}

	/**
	 * Clear all stored audio files
	 */
	async clearAllFiles(): Promise<void> {
		// Stop all active streams
		Array.from(this.activeStreams().keys()).forEach(id => {
			this.stopStream(id);
		});

		// Clear memory
		this.audioFiles.set(new Map());

		// Clear IndexedDB
		if (this.db) {
			return new Promise((resolve, reject) => {
				const transaction = this.db!.transaction([this.storeName], 'readwrite');
				const store = transaction.objectStore(this.storeName);
				const request = store.clear();

				request.onsuccess = () => resolve();
				request.onerror = () => {
					console.error('Failed to clear database');
					reject(new Error('Failed to clear database'));
				};
			});
		}
	}

	/**
	 * Get storage usage information
	 */
	async getStorageInfo(): Promise<{ used: number; total: number }> {
		if (!this.db) {
			return { used: 0, total: 0 };
		}

		return new Promise((resolve) => {
			const transaction = this.db!.transaction([this.storeName], 'readonly');
			const store = transaction.objectStore(this.storeName);
			const request = store.getAll();

			request.onsuccess = () => {
				const files = request.result;
				let totalSize = 0;

				files.forEach((file: AudioFile) => {
					totalSize += file.blob.size;
				});

				// Estimate total available storage (rough estimate)
				const estimatedTotal = 50 * 1024 * 1024; // 50MB estimate

				resolve({
					used: totalSize,
					total: estimatedTotal
				});
			};

			request.onerror = () => {
				resolve({ used: 0, total: 0 });
			};
		});
	}

	/**
	 * Generate unique ID for audio files
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Resume AudioContext if suspended (required for autoplay policies)
	 */
	async resumeAudioContext(): Promise<void> {
		const context = this.audioContext();
		if (context && context.state === 'suspended') {
			await context.resume();
		}
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		// Stop all active streams
		Array.from(this.activeStreams().keys()).forEach(id => {
			this.stopStream(id);
		});

		// Close AudioContext
		const context = this.audioContext();
		if (context) {
			context.close();
		}

		// Close database connection
		if (this.db) {
			this.db.close();
		}
	}
}

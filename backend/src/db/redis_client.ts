import { AudioFileData, WaveformData } from '@shared/types';
import { REDIS_URL } from '@src/env';
import Redis from 'ioredis'

export const redis = new Redis(REDIS_URL!);

redis.on('error', (err) => console.error('Redis Client Error', err));
console.log("Redis connected")

// ===========================================================================

export const CACHE_CONFIG = {
	audioFile: {
		ttl: 30 * 60, // 10 minutes
		keyPrefix: 'audio',
	},
	exportFile: {
		ttl: 10 * 60, // 30 minutes
		keyPrefix: 'export',
	},
	exportBuffer: {
		ttl: 10 * 60, // 30 minutes
		keyPrefix: 'buffer',
	},
	waveform: {
		ttl: 10 * 60, // 30 minutes
		keyPrefix: 'waveform',
	},
};
export function getAudioFileKey(projectId: string, fileId: string): string {
	return `${CACHE_CONFIG.audioFile.keyPrefix}:${projectId}:${fileId}`;
}
export function getExportFileKey(projectId: string): string {
	return `${CACHE_CONFIG.exportFile.keyPrefix}:${projectId}`;
}
export function getExportBufferKey(projectId: string): string {
	return `${CACHE_CONFIG.exportBuffer.keyPrefix}:${projectId}`;
}
export function getWaveformFileKey(projectId: string): string {
	return `${CACHE_CONFIG.waveform.keyPrefix}:${projectId}`;
}

// ===========================================================================

export async function getCachedAudioFileData(key: string): Promise<AudioFileData | null> {
	try {
		const cached = await redis.get(key);
		if (cached) {
			return JSON.parse(cached) as AudioFileData;
		}
		return null;
	} catch (error) {
		console.error(`Cache retrieval error for ${key}:`, error);
		return null;
	}
}
export async function setCachedAudioFileData(key: string, data: AudioFileData, ttl: number): Promise<void> {
	try {
		await redis.setex(key, ttl, JSON.stringify(data));
	} catch (error) {
		console.error(`Cache storage error for ${key}:`, error);
	}
}

export async function getCachedBuffer(key: string): Promise<Buffer | null> {
	try {
		const cached = await redis.getBuffer(key);
		if (cached) {
			return cached;
		}
		return null;
	} catch (error) {
		console.error(`Cache retrieval error for ${key}:`, error);
		return null;
	}
}
export async function setCachedBuffer(key: string, data: Buffer, ttl: number): Promise<void> {
	try {
		await redis.setex(key, ttl, data);
	} catch (error) {
		console.error(`Cache storage error for ${key}:`, error);
	}
}

export async function getCachedWaveformData(key: string): Promise<WaveformData | null> {
	try {
		const cached = await redis.get(key);
		if (cached) {
			return JSON.parse(cached) as WaveformData;
		}
		return null;
	} catch (error) {
		console.error(`Cache retrieval error for ${key}:`, error);
		return null;
	}
}
export async function setCachedWaveformData(key: string, data: WaveformData, ttl: number): Promise<void> {
	try {
		await redis.setex(key, ttl, JSON.stringify(data));
	} catch (error) {
		console.error(`Cache storage error for ${key}:`, error);
	}
}
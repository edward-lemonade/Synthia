import { AudioFileData } from '@shared/types';
import { REDIS_URL } from '@src/env';
import { createClient } from 'redis';

export const redis = createClient({
	url: REDIS_URL
});

redis.on('error', (err) => console.error('Redis Client Error', err));

await redis.connect(); 
console.log("activated redis")

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
};
export function getAudioFileKey(projectId: string, fileId: string): string {
	return `${CACHE_CONFIG.audioFile.keyPrefix}:${projectId}:${fileId}`;
}
export function getExportFileKey(projectId: string): string {
	return `${CACHE_CONFIG.exportFile.keyPrefix}:${projectId}`;
}

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
		await redis.setEx(key, ttl, JSON.stringify(data));
	} catch (error) {
		console.error(`Cache storage error for ${key}:`, error);
	}
}
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { AudioFileData, WaveformData } from "@shared/types";
import { generateAudioWaveformB } from "@shared/audio-processing/waveform/waveform.backend";
import { Readable } from "stream";
import * as redis_client from './redis_client';
import { redis } from './redis_client';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Base64 } from "js-base64";
import { AudioContext } from "isomorphic-web-audio-api";

const s3 = new S3Client({ region: 'us-west-1' });

export async function putAudioFile(projectId: string, fileId: string, file: Express.Multer.File) {
	const key = 'projects/' + projectId + '/files/' + fileId;
	const command = new PutObjectCommand({
		Bucket: 'app-synthia',
		Key: key,
		Body: file.buffer,
		ContentType: file.mimetype,
	});

	try {
		await s3.send(command);
		console.log(`Uploaded audio data`);

		const cacheKey = redis_client.getAudioFileKey(projectId, fileId);
		redis.del(cacheKey);
	} catch (error) {
		console.error("Upload audio data:", error);
		throw error;
	}
}
export async function getAudioFile(projectId: string, fileId: string) : Promise<AudioFileData> {
	// Query redis

	const cacheKey = redis_client.getAudioFileKey(projectId, fileId);
	const cachedData = await redis_client.getCachedAudioFileData(cacheKey);
	if (cachedData) {
		return cachedData;
	}
	
	// Query AWS

	const key = 'projects/' + projectId + '/files/' + fileId;
	const command = new GetObjectCommand({
		Bucket: "app-synthia",
		Key: key,
	});

	const response = await s3.send(command);

	const stream = response.Body as Readable;
	const chunks: Uint8Array[] = [];

	for await (const chunk of stream) {
		chunks.push(chunk as Uint8Array);
	}
	const buffer = Buffer.concat(chunks);

	const projectFile: AudioFileData = {
		fileId: fileId,
		buffer64: buffer.toString('base64'),
		mimeType: response.ContentType!,
	}

	await redis_client.setCachedAudioFileData(cacheKey, projectFile, redis_client.CACHE_CONFIG.audioFile.ttl);

	return projectFile;
}

export async function putExportFile(projectId: string, file: Blob): Promise<void> {

	// Convert Blob to ArrayBuffer for consistent handling
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	
	const key = 'project/' + projectId + '/export';
	const command = new PutObjectCommand({
		Bucket: 'app-synthia',
		Key: key,
		Body: buffer,
		ContentType: 'audio/wav', // Explicitly set content type for WAV files
	});

	try {
		await s3.send(command);
		console.log(`Uploaded export`);

		const cacheKey = redis_client.getExportFileKey(projectId);
		redis.del(cacheKey);
	} catch (error) {
		console.error("Upload export:", error);
		throw error;
	}
}
export async function getExportFile(projectId: string): Promise<AudioFileData> {
	// Query Redis
	
	const cacheKey = redis_client.getExportFileKey(projectId);
	const cachedData = await redis_client.getCachedAudioFileData(cacheKey);
	if (cachedData) {
		return cachedData;
	}
	
	// Query AWS

	const key = 'project/' + projectId + '/export';
	const command = new GetObjectCommand({
		Bucket: "app-synthia",
		Key: key,
	});

	const response = await s3.send(command);

	if (!response.Body) {
		throw new Error("No body in S3 response");
	}

	// Handle the stream consistently with getAudioFile
	const stream = response.Body as Readable;
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk as Uint8Array);
	}
	const buffer = Buffer.concat(chunks);

	const audioFileData: AudioFileData = {
		fileId: 'export', // Use 'export' as the fileId since this is an export file
		buffer64: buffer.toString('base64'),
		mimeType: response.ContentType || 'audio/wav',
	};

	(async () => {
		const audioFileDataWithWaveform = await populateWaveformData(audioFileData);
		await redis_client.setCachedAudioFileData(
			cacheKey,
			audioFileDataWithWaveform,
			redis_client.CACHE_CONFIG.exportFile.ttl
		);
	})();
	return audioFileData;
}

export async function putProfilePicture(userId: string, file: Express.Multer.File): Promise<void> {
	const key = `user/${userId}/pfp`;

	const command = new PutObjectCommand({
		Bucket: 'app-synthia',
		Key: key,
		Body: file.buffer,
		ContentType: file.mimetype,
	});

	try {
		await s3.send(command);
		console.log(`Uploaded profile picture for user ${userId}`);
	} catch (error) {
		console.error(`Failed to upload profile picture for user ${userId}:`, error);
		throw new Error(`Failed to upload profile picture: ${error}`);
	}
}
export async function getProfilePicture(userId: string): Promise<{ buffer: Buffer; contentType?: string }> {
	const key = `user/${userId}/pfp`;
	const command = new GetObjectCommand({
		Bucket: "app-synthia",
		Key: key,
	});

	try {
		const response = await s3.send(command);

		if (!response.Body) {
			throw new Error("No body in S3 response");
		}

		let buffer: Buffer;
		
		if (response.Body instanceof Readable) {
			const chunks: Buffer[] = [];
			for await (const chunk of response.Body) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			buffer = Buffer.concat(chunks);
		} else if (response.Body instanceof Uint8Array) {
			buffer = Buffer.from(response.Body);
		} else {
			const chunks: Uint8Array[] = [];
			const stream = response.Body as any;
			
			for await (const chunk of stream) {
				chunks.push(chunk);
			}
			buffer = Buffer.concat(chunks);
		}
		
		return {
			buffer,
			contentType: response.ContentType
		};
		
	} catch (error: any) {
		if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
			throw new Error(`Profile picture not found for user ${userId}`);
		}
		console.error(`Failed to get profile picture for user ${userId}:`, error);
		throw new Error(`Failed to retrieve profile picture: ${error.message}`);
	}
}
export async function getProfilePictureUrl(userId: string, options?: {
	expiresIn?: number; // seconds, default 1 hour
	responseContentType?: string; // force content type
	responseContentDisposition?: string; // force download behavior
}): Promise<string | null> {
	const key = `user/${userId}/pfp`;
	const { expiresIn = 3600, responseContentType, responseContentDisposition } = options || {};

	const commandParams: any = {
		Bucket: "app-synthia",
		Key: key,
	};

	if (responseContentType) {commandParams.ResponseContentType = responseContentType;}
	if (responseContentDisposition) {commandParams.ResponseContentDisposition = responseContentDisposition;}

	const command = new GetObjectCommand(commandParams);

	try {
		const signedUrl = await getSignedUrl(s3, command, { expiresIn });
		return signedUrl;
	} catch (error: any) {
		if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
			return null;
		}
		console.error(`Failed to get profile picture URL for user ${userId}:`, error);
		throw new Error(`Failed to retrieve profile picture URL: ${error.message}`);
	}
}

// ========================================================================================
// Helpers

async function populateWaveformData(audioFileData: AudioFileData): Promise<AudioFileData> {
	const arrayBuffer = base64ToArrayBuffer(audioFileData.buffer64);
	const waveformData = audioFileData.waveformData ?? await generateAudioWaveformB(arrayBuffer);

	return {...audioFileData, waveformData}
}
function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const bytes = Base64.toUint8Array(base64);
	return bytes.buffer as ArrayBuffer;
}

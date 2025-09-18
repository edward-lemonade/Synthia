import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { AudioFileData } from "@shared/types";
import { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
		console.log(`✅ Uploaded audio data`);
	} catch (error) {
		console.error("❌ Upload audio data:", error);
		throw error;
	}
}
export async function getAudioFile(projectId: string, fileId: string) : Promise<AudioFileData> {
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
	return projectFile;
}

export async function putExportFile(projectId: string, file: Blob): Promise<void> {
	const key = 'project/' + projectId + '/export';
	
	// Convert Blob to ArrayBuffer for consistent handling
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	
	const command = new PutObjectCommand({
		Bucket: 'app-synthia',
		Key: key,
		Body: buffer,
		ContentType: 'audio/wav', // Explicitly set content type for WAV files
	});

	try {
		await s3.send(command);
		console.log(`✅ Uploaded export`);
	} catch (error) {
		console.error("❌ Upload export:", error);
		throw error;
	}
}
export async function getExportFile(projectId: string): Promise<AudioFileData> {
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
		console.log(`✅ Uploaded profile picture for user ${userId}`);
	} catch (error) {
		console.error(`❌ Failed to upload profile picture for user ${userId}:`, error);
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
		console.error(`❌ Failed to get profile picture for user ${userId}:`, error);
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
		console.error(`❌ Failed to get profile picture URL for user ${userId}:`, error);
		throw new Error(`Failed to retrieve profile picture URL: ${error.message}`);
	}
}

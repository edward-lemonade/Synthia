import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { AudioFileData } from "@shared/types";
import { Readable } from "stream";

const s3 = new S3Client({ region: 'us-west-1' });

export async function putAudioFile(projectId: string, fileId: string, file: Express.Multer.File) {
	const key = projectId + '/files/' + fileId;
	const command = new PutObjectCommand({
		Bucket: 'noteflyte',
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
	const key = projectId + '/files/' + fileId;

	const command = new GetObjectCommand({
		Bucket: "noteflyte",
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
	const key = projectId + '/export';
	
	// Convert Blob to ArrayBuffer for consistent handling
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	
	const command = new PutObjectCommand({
		Bucket: 'noteflyte',
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
	const key = projectId + '/export';

	const command = new GetObjectCommand({
		Bucket: "noteflyte",
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
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { AudioFileRef, BaseFileRef, FileMetadata, ProjectFile } from "@shared/types";
import { RegionType } from "@src/models/project/Track.model";
import { Readable } from "stream";

const s3 = new S3Client({ region: 'us-west-1' });

export async function putAudioFile(projectId: string, fileId: string, file: Express.Multer.File) {
	const key = projectId + '/' + fileId;
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

export async function getAudioFile(projectId: string, fileId: string) : Promise<ProjectFile> {
	const key = projectId + '/' + fileId;

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

	const projectFile: ProjectFile = {
		fileId: fileId,
		buffer64: buffer.toString('base64'),
		mimeType: response.ContentType!,
	}
	return projectFile;
}

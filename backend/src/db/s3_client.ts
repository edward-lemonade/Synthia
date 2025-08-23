import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { BaseFile } from "@shared/types";
import { Readable } from "stream";

const s3 = new S3Client({ region: 'us-west-1' });

export async function putFile(projectId: string, fileId: string, buffer: Buffer) {
	const key = projectId + '/' + fileId;
	const command = new PutObjectCommand({
		Bucket: 'noteflyte',
		Key: key,
		Body: buffer,
	});

	try {
		await s3.send(command);
		console.log(`✅ Uploaded audio data`);
	} catch (error) {
		console.error("❌ Upload audio data:", error);
		throw error;
	}
}

export async function putFiles(projectId: string, backendFiles: BaseFile[]) {
	backendFiles.forEach(backendFile => {
		putFile(projectId, backendFile.fileId, backendFile.fileData!);
	});
}

export async function getFile(projectId: string, fileId: string) : Promise<Buffer<ArrayBufferLike>> {
	const key = projectId + '/' + fileId;
	const command = new GetObjectCommand({
		Bucket: 'noteflyte',
		Key: key,
	});

	const response = await s3.send(command);
	if (!response.Body) throw new Error("No body in response");

	const stream = response.Body as Readable;

	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks);
}

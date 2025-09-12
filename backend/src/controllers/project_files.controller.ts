import { Request, Response } from "express";
import { BaseFileRef, AudioFileData } from "@shared/types";
import { getAudioFile, putAudioFile } from "@src/db/s3_client";

export async function saveAudioFiles(req: Request, res: Response) {
	const files = req.files as Express.Multer.File[];
	let fileIds = req.body.fileIds as string[] | string;
	const projectId = req.body.projectId;

	if (!Array.isArray(fileIds)) {
		fileIds = [fileIds];
	}

	if (!files || files.length === 0) {
		return res.status(400).json({ success: false, message: "No files uploaded" });
	}

	files.forEach((file, i) => {
		const fileId = fileIds[i];
		putAudioFile(projectId, fileId, file);
	});

	res.json({ success: true, count: files.length });
}

export async function loadAudioFiles(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const fileRefs: BaseFileRef[] = req.body.fileRefs;

	const audioDataPromises = fileRefs.map(async (fileRef) => await getAudioFile(projectId, fileRef.fileId));
	const audioDatas: AudioFileData[] = await Promise.all(audioDataPromises);

	res.json({ success: true, audioFileDatas: audioDatas });
}
import { Request, Response } from "express";
import { BaseFileRef, AudioFileData } from "@shared/types";
import { getAudioFile, putAudioFile } from "@src/db/s3_client";
import { assertProjectAccess } from "@src/utils/authorization";

export async function saveAudioFiles(req: Request, res: Response) {
	try {
		const projectId = req.body.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		const files = req.files as Express.Multer.File[];
		let fileIds = req.body.fileIds as string[] | string;

		if (!Array.isArray(fileIds)) {
			fileIds = [fileIds];
		}

		if (!files || files.length === 0) {
			return res.status(400).json({ success: false, message: "No files uploaded" });
		}

		// Save all files
		await Promise.all(
			files.map((file, i) => {
				const fileId = fileIds[i];
				return putAudioFile(projectId, fileId, file);
			})
		);

		res.json({ success: true, count: files.length });
	} catch (error: any) {
		console.error('Error saving audio files:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).json({ success: false, message: error.message });
		}
		return res.status(500).json({ success: false, message: "Internal server error" });
	}
}

export async function loadAudioFiles(req: Request, res: Response) {
	try {
		const projectId = req.body.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		const fileRefs: BaseFileRef[] = req.body.fileRefs;

		const audioDataPromises = fileRefs.map(async (fileRef) => await getAudioFile(projectId, fileRef.fileId));
		const audioDatas: AudioFileData[] = await Promise.all(audioDataPromises);

		res.json({ success: true, audioFileDatas: audioDatas });
	} catch (error: any) {
		console.error('Error loading audio files:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).json({ success: false, message: error.message });
		}
		return res.status(500).json({ success: false, message: "Internal server error" });
	}
}
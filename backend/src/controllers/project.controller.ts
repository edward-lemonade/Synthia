import { Request, Response } from "express";
import { applyPatches, Patch } from "immer";

import * as db from "@src/db/mongo_client";

import { AudioFileData, ProjectFront, ProjectState } from "@shared/types";
import { ProjectMetadataTransformer, ProjectStudioTransformer } from "@src/transformers/project.transformer";
import { ProjectFrontModel, ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import * as s3 from "@src/db/s3_client";
import { Renderer } from "@src/audio-processing/Renderer";
import { assertAuthorship, assertProjectAccess } from "@src/utils/authorization";
import { generateAudioWaveformB } from "@src/utils/audio";
import { Base64 } from "js-base64";


export async function getMine(req: Request, res: Response) {
	const userId = req.auth?.sub;
	const metadataDocs = await db.findMetadatasByUser(userId);
	const metadatas = metadataDocs.map((doc) => ProjectMetadataTransformer.fromDoc(doc));

	res.json({ projects: metadatas })
}

export async function getProject(req: Request, res: Response) {
	const projectId = req.params.projectId;
	const metadataDoc = await db.findMetadataByProjectId(projectId);
	const metadata = metadataDoc ? ProjectMetadataTransformer.fromDoc(metadataDoc) : null;

	res.json({ project: metadata })
}

export async function saveOverwrite(req: Request, res: Response) {
	const projectId = req.params.projectId;
	const userId = req.auth?.sub;
	if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
	if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });

	const [{success, metadataDoc}, studioDoc] = await Promise.all([
		await assertProjectAccess(projectId, userId),
		db.findStudioByProjectId(projectId)
	]);

	const state = req.body.state as ProjectState;
	state.metadata.updatedAt = new Date();

	if (!metadataDoc || !studioDoc) {
		console.error("Project not found for overwrite.");
		res.json({ success: false });
		return;
	}

	const metadataSchema = ProjectMetadataTransformer.toDoc(state.metadata);
	const studioSchema = ProjectStudioTransformer.toDoc(
		metadataDoc,
		state.studio
	);

	Object.assign(metadataDoc, metadataSchema);
	Object.assign(studioDoc, studioSchema);

	const [savedMetadataDoc, savedStudioDoc] = await Promise.all([
		metadataDoc.save(),
		studioDoc.save()
	]);

	if (!savedMetadataDoc) {
		console.error("Failed to overwrite project metadata.");
		res.json({ success: false });
		return;
	}
	if (!savedStudioDoc) {
		console.error("Failed to overwrite project studio.");
		res.json({ success: false });
		return;
	}

	renderAndStore(state);

	res.json({ success: true });

}

export async function saveNew(req: Request, res: Response) {
	const userId = req.auth?.sub;
	if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

	const state = req.body.state as ProjectState;
	if (!assertAuthorship(state.metadata, userId)) {
		console.error("Attempted to save project under different user."); res.json({ success: false }); 
		return;
	}

	const metadataSchema = ProjectMetadataTransformer.toDoc(state.metadata);
	const metadataDoc = new ProjectMetadataModel(metadataSchema)
	const savedMetadataDoc = await metadataDoc.save();

	if (!savedMetadataDoc) { console.error("Failed to save new project metadata."); res.json({ success: false }); return }

	const studioSchema = ProjectStudioTransformer.toDoc(savedMetadataDoc, state.studio);
	const studioDoc = new ProjectStudioModel(studioSchema)
	const savedStudioDoc = await studioDoc.save();

	if (!savedStudioDoc) { console.error("Failed to save new project studio."); res.json({ success: false }); return }

	renderAndStore(state);

	res.json({ success: true })
}

export async function load(req: Request, res: Response) {
	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });

		const [{success, metadataDoc}, studioDoc] = await Promise.all([
			await assertProjectAccess(projectId, userId),
			await db.findStudioByProjectId(projectId)
		]);

		if (!metadataDoc || !studioDoc) { 
			console.error("Failed to load project metadata."); 
			return res.status(404).json({ success: false, message: "Project not found" }); 
		}

		const state = ProjectStudioTransformer.toState(metadataDoc, studioDoc);
		res.json({ state: state });
	} catch (error: any) {
		console.error('Error loading project:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).json({ success: false, message: error.message });
		}
		return res.status(500).json({ success: false, message: "Internal server error" });
	}
}

export async function deleteStudio(req: Request, res: Response) {
	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		const [resM, resS, resF, resS3] = await Promise.all([
			db.deleteStudioByProjectId(projectId),
			db.deleteMetadataByProjectId(projectId),
			db.deleteFrontByProjectId(projectId),
			s3.deleteProjectData(projectId),
		]);
		if (!resM || !resS || (!resF && metadataDoc?.isReleased) || !resS3) { 
			console.error("Failed to delete project from MongoDB."); 
			return res.status(500).json({ success: false, message: "Failed to delete project from MongoDB" }); 
		}

		res.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting project:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).json({ success: false, message: error.message });
		}
		return res.status(500).json({ success: false, message: "Internal server error" });
	}
}

export async function rename(req: Request, res: Response) {	
	const projectId = req.params.projectId;
	const userId = req.auth?.sub;
	if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
	if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
	const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

	if (!metadataDoc) { console.error("Failed to find project."); res.json({ success: false }); return }

	const newName = req.body.newName;
	metadataDoc.title = newName;

    const savedDoc = await metadataDoc.save();
	if (!savedDoc) { console.error("Failed to save new name."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function renameFront(req: Request, res: Response) {	
	const projectId = req.params.projectId;
	const userId = req.auth?.sub;
	if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
	if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
	const [{success, metadataDoc}, frontDoc] = await Promise.all([
		await assertProjectAccess(projectId, userId),
		db.findFrontByProjectId(projectId)
	]);

	if (!metadataDoc || !frontDoc) { 
		console.error("Failed to load project metadata."); 
		return res.status(404).json({ success: false, message: "Project not found" }); 
	}

	const newName = req.body.newName;
	frontDoc.title = newName;

	const savedDoc = await frontDoc.save();
	if (!savedDoc) { console.error("Failed to save new name."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function getExport(req: Request, res: Response) {
	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		const audioFileData: AudioFileData = await s3.getExportFile(projectId);
		const buffer64 = audioFileData.buffer64;

		res.setHeader('Content-Type', 'text/plain');
		res.setHeader('Transfer-Encoding', 'chunked');
		
		const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
		let offset = 0;
		
		while (offset < buffer64.length) {
			const chunk = buffer64.slice(offset, offset + CHUNK_SIZE);
			res.write(chunk);
			offset += CHUNK_SIZE;

			await new Promise(resolve => setImmediate(resolve));
		}
		res.end();

	} catch (error: any) {
		console.error('Error getting export file:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).end();
		}
		return res.status(500).end();
	}
}

export async function getWaveform(req: Request, res: Response) {
	const { projectId } = req.params;
	const userId = req.auth?.sub;
	if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
	if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
	const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

	try {
		const waveformData = await s3.getWaveformData(projectId);
		if (!waveformData) {
			res.json({ success: false, waveformData: null });
		}
		res.json({ success: true, waveformData: waveformData });
	} catch (error) {
		console.error('Error getting project audio:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to get project audio' 
		});
	}
}

export async function getFront(req: Request, res: Response) {
	const projectId = req.params.projectId;

	try {
		const frontDoc = await db.findFrontByProjectId(projectId);
		if (!frontDoc) {
			res.status(404).json({ 
				success: false, 
				error: 'Project front not found' 
			});
			return;
		}

		res.json({ 
			success: true, 
			projectFront: frontDoc.toObject()
		});
        
	} catch (error) {
		console.error('Error getting project front:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to get project front' 
		});
	}
}

export async function publish(req: Request, res: Response) {
    try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		if (!metadataDoc) {
			console.error('Error creating ProjectFront: No metadata found');
			res.status(500).json({ 
				success: false, 
				error: 'Failed to create project front' 
			});
			return;
		}

		const description = req.body.description;

		let frontDoc = await db.findFrontByProjectId(projectId);
		if (frontDoc) {
			// update
			frontDoc.description = description;
			await frontDoc.save();
		} else {
			// create new
			frontDoc = await ProjectFrontModel.create({
				projectId,
				title: metadataDoc!.title,
				description,
				projectMetadataId: metadataDoc!._id,
			});
		}

		metadataDoc.isReleased = true;
		await metadataDoc.save();
        
        res.json({ 
            success: true, 
            projectFront: frontDoc.toObject(), 
        });
        
    } catch (error) {
        console.error('Error creating ProjectFront:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create project front' 
        });
    }
}

export async function unpublish(req: Request, res: Response) {
	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		if (!metadataDoc) {
			console.error('Error unpublishing: No metadata found');
			res.status(404).json({ 
				success: false, 
				error: 'Project not found' 
			});
			return;
		}

		const frontDoc = await db.findFrontByProjectId(projectId);
		if (frontDoc) {
			await db.deleteProjectComments(projectId);
			await db.deleteProjectLikes(projectId);
			await db.deleteFrontByProjectId(projectId);
		}

		metadataDoc.isReleased = false;
		await metadataDoc.save();
        
		res.json({ 
			success: true
		});
        
	} catch (error) {
		console.error('Error unpublishing project:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to unpublish project' 
		});
	}
}

// =======================================================================
// Common pipelines

export async function renderAndStore(state: ProjectState) {
	const renderer = await new Renderer(state);
	const blob = await renderer.exportProjectAsWAV();

	const arrayBuffer = await blob.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	await s3.putExportFile(state.metadata.projectId, buffer);

	(async () => {
		const waveformData = await generateAudioWaveformB(arrayBuffer);
		await s3.putWaveformData(state.metadata.projectId, waveformData);
	})();
}
import { Request, Response } from "express";
import { applyPatches, Patch } from "immer";
import mongoose from "mongoose";

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
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) {
			await session.abortTransaction();
			return res.status(401).json({ success: false, message: "Authentication required" });
		}
		if (!projectId) {
			await session.abortTransaction();
			return res.status(400).json({ success: false, message: "Project ID is required" });
		}

		const [{success, metadataDoc}, studioDoc] = await Promise.all([
			await assertProjectAccess(projectId, userId, session),
			db.findStudioByProjectId(projectId)
		]);

		const state = req.body.state as ProjectState;
		state.metadata.updatedAt = new Date();

		if (!metadataDoc || !studioDoc) {
			console.error("Project not found for overwrite.");
			await session.abortTransaction();
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
			metadataDoc.save({ session }),
			studioDoc.save({ session })
		]);

		if (!savedMetadataDoc || !savedStudioDoc) {
			console.error("Failed to overwrite project.");
			await session.abortTransaction();
			res.json({ success: false });
			return;
		}

		await session.commitTransaction();

		// Render and store happens after transaction commits (async, non-critical)
		renderAndStore(state);

		res.json({ success: true });
	} catch (error) {
		await session.abortTransaction();
		console.error('Error in saveOverwrite:', error);
		res.status(500).json({ success: false, message: "Internal server error" });
	} finally {
		session.endSession();
	}
}

export async function saveNew(req: Request, res: Response) {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const userId = req.auth?.sub;
		if (!userId) {
			await session.abortTransaction();
			return res.status(401).json({ success: false, message: "Authentication required" });
		}

		const state = req.body.state as ProjectState;
		if (!assertAuthorship(state.metadata, userId)) {
			console.error("Attempted to save project under different user.");
			await session.abortTransaction();
			res.json({ success: false });
			return;
		}

		const metadataSchema = ProjectMetadataTransformer.toDoc(state.metadata);
		const metadataDoc = new ProjectMetadataModel(metadataSchema);
		const savedMetadataDoc = await metadataDoc.save({ session });

		if (!savedMetadataDoc) {
			console.error("Failed to save new project metadata.");
			await session.abortTransaction();
			res.json({ success: false });
			return;
		}

		const studioSchema = ProjectStudioTransformer.toDoc(savedMetadataDoc, state.studio);
		const studioDoc = new ProjectStudioModel(studioSchema);
		const savedStudioDoc = await studioDoc.save({ session });

		if (!savedStudioDoc) {
			console.error("Failed to save new project studio.");
			await session.abortTransaction();
			res.json({ success: false });
			return;
		}

		await session.commitTransaction();

		// Render and store happens after transaction commits (async, non-critical)
		renderAndStore(state);

		res.json({ success: true });
	} catch (error) {
		await session.abortTransaction();
		console.error('Error in saveNew:', error);
		res.status(500).json({ success: false, message: "Internal server error" });
	} finally {
		session.endSession();
	}
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
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) {
			await session.abortTransaction();
			return res.status(401).json({ success: false, message: "Authentication required" });
		}
		if (!projectId) {
			await session.abortTransaction();
			return res.status(400).json({ success: false, message: "Project ID is required" });
		}
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId, session);

		const [resM, resS, resF] = await Promise.all([
			db.deleteMetadataByProjectId(projectId, session),
			db.deleteStudioByProjectId(projectId, session),
			db.deleteFrontByProjectId(projectId, session),
		]);

		if (!resM || !resS || (!resF && metadataDoc?.isReleased)) { 
			console.error("Failed to delete project from MongoDB."); 
			await session.abortTransaction();
			return res.status(500).json({ success: false, message: "Failed to delete project from MongoDB" }); 
		}

		await session.commitTransaction();

		// Delete from S3 after transaction commits (async, can be retried if fails)
		try {
			await s3.deleteProjectData(projectId);
		} catch (s3Error) {
			console.error('Failed to delete S3 data (but DB transaction committed):', s3Error);
			// Consider adding to a cleanup queue here
		}

		res.json({ success: true });
	} catch (error: any) {
		await session.abortTransaction();
		console.error('Error deleting project:', error);
		if (error.message.includes('Access denied')) {
			return res.status(403).json({ success: false, message: error.message });
		}
		return res.status(500).json({ success: false, message: "Internal server error" });
	} finally {
		session.endSession();
	}
}

export async function rename(req: Request, res: Response) {	
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId, session);

		if (!metadataDoc) { console.error("Failed to find project."); res.json({ success: false }); return }

		const newName = req.body.newName;
		metadataDoc.title = newName;

		const savedDoc = await metadataDoc.save({session});
		if (!savedDoc) { console.error("Failed to save new name."); res.json({ success: false }); return }
		res.json({ success: true });

		await session.commitTransaction();
	} catch (error) {
		await session.abortTransaction();
		console.error('Error renaming project:', error);
		return res.status(500).json({ success: false, message: "Internal server error" });
	} finally {
		session.endSession();
	}
}

export async function renameFront(req: Request, res: Response) {	
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const [{success, metadataDoc}, frontDoc] = await Promise.all([
			await assertProjectAccess(projectId, userId, session),
			db.findFrontByProjectId(projectId)
		]);

		if (!metadataDoc || !frontDoc) { 
			console.error("Failed to load project metadata."); 
			return res.status(404).json({ success: false, message: "Project not found" }); 
		}

		const newName = req.body.newName;
		frontDoc.title = newName;

		const savedDoc = await frontDoc.save({session});
		if (!savedDoc) { console.error("Failed to save new name."); res.json({ success: false }); return }

		await session.commitTransaction();

		res.json({ success: true });
	} catch (error: any) {
		session.abortTransaction();
		console.error('Error renaming project front:', error);
	} finally {
		session.endSession();
	}
}

export async function getExport(req: Request, res: Response) {
	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });
		if (!projectId) return res.status(400).json({ success: false, message: "Project ID is required" });
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId);

		const audioFileData: AudioFileData|null = await s3.getExportFile(projectId);
		if (!audioFileData) {throw new Error("File not found in S3");}
		
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
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) {
			await session.abortTransaction();
			return res.status(401).json({ success: false, message: "Authentication required" });
		}
		if (!projectId) {
			await session.abortTransaction();
			return res.status(400).json({ success: false, message: "Project ID is required" });
		}
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId, session);

		if (!metadataDoc) {
			console.error('Error creating ProjectFront: No metadata found');
			await session.abortTransaction();
			res.status(500).json({ 
				success: false, 
				error: 'Failed to create project front' 
			});
			return;
		}

		const description = req.body.description;

		let frontDoc = await db.findFrontByProjectId(projectId, session);

		if (frontDoc) {
			// update
			frontDoc.description = description;
			await frontDoc.save({ session });
		} else {
			// create new
			console.log(metadataDoc!._id);
			[frontDoc] = await ProjectFrontModel.create([{
				projectId,
				title: metadataDoc!.title,
				description,
				projectMetadataId: metadataDoc!._id,
			}], { session });
		}

		metadataDoc.isReleased = true;
		await metadataDoc.save({ session });

		await session.commitTransaction();
        
        res.json({ 
            success: true, 
            projectFront: frontDoc.toObject(), 
        });
        
    } catch (error) {
		await session.abortTransaction();
        console.error('Error creating ProjectFront:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create project front' 
        });
    } finally {
		session.endSession();
	}
}

export async function unpublish(req: Request, res: Response) {
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const projectId = req.params.projectId;
		const userId = req.auth?.sub;
		if (!userId) {
			await session.abortTransaction();
			return res.status(401).json({ success: false, message: "Authentication required" });
		}
		if (!projectId) {
			await session.abortTransaction();
			return res.status(400).json({ success: false, message: "Project ID is required" });
		}
		const {success, metadataDoc} = await assertProjectAccess(projectId, userId, session);

		if (!metadataDoc) {
			console.error('Error unpublishing: No metadata found');
			await session.abortTransaction();
			res.status(404).json({ 
				success: false, 
				error: 'Project not found' 
			});
			return;
		}

		const frontDoc = await db.findFrontByProjectId(projectId);
		if (frontDoc) {
			await Promise.all([
				db.deleteProjectComments(projectId, session),
				db.deleteProjectLikes(projectId, session),
				db.deleteFrontByProjectId(projectId, session)
			]);
		}

		metadataDoc.isReleased = false;
		await metadataDoc.save({ session });

		await session.commitTransaction();
        
		res.json({ 
			success: true
		});
        
	} catch (error) {
		await session.abortTransaction();
		console.error('Error unpublishing project:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to unpublish project' 
		});
	} finally {
		session.endSession();
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
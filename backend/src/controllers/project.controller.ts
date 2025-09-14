import { Request, Response } from "express";
import { applyPatches, Patch } from "immer";

import * as db from "@src/db/mongo_client";

import { AudioFileData, ProjectFront, ProjectState } from "@shared/types";
import { ProjectMetadataTransformer, ProjectStudioTransformer } from "@src/transformers/project.transformer";
import { ProjectFrontModel, ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import { getExportFile, putExportFile } from "@src/db/s3_client";
import { Renderer } from "@src/audio-processing/Renderer"


export async function getMine(req: Request, res: Response) {
	const userId = req.body.userId;
	const metadataDocs = await db.findMetadatasByUser(userId);
	const metadatas = metadataDocs.map((doc) => ProjectMetadataTransformer.fromDoc(doc));

	res.json({ projects: metadatas })
}

export async function getProject(req: Request, res: Response) {
	const metadataDoc = await db.findMetadataByProjectId(req.body.projectId);
	const metadata = metadataDoc ? ProjectMetadataTransformer.fromDoc(metadataDoc) : null;

	res.json({ project: metadata })
}

export async function saveExisting(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const patches = req.body.patches as Patch[];

	const [metadataDoc, studioDoc] = await Promise.all([
		db.findMetadataByProjectId(projectId),
		db.findStudioByProjectId(projectId)
	]);

	if (!metadataDoc || !studioDoc) {
		res.json({ success: false });
		return;
	}
	const state = ProjectStudioTransformer.toState(metadataDoc, studioDoc)
	const stateUpdated = applyPatches(state, patches);

	Object.assign(studioDoc, stateUpdated.studio);
	Object.assign(metadataDoc, stateUpdated.metadata);

	const [savedMetadataDoc, savedStudioDoc] = await Promise.all([
		metadataDoc.save(),
		studioDoc.save(),
	]);
	if (!savedMetadataDoc) { console.error("Failed to save project metadata."); res.json({ success: false }); return }
	if (!savedStudioDoc) { console.error("Failed to save project studio."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function saveOverwrite(req: Request, res: Response) {
	const state = req.body.state as ProjectState;
	state.metadata.updatedAt = new Date();

	const [metadataDoc, studioDoc] = await Promise.all([
		db.findMetadataByProjectId(state.metadata.projectId),
		db.findStudioByProjectId(state.metadata.projectId)
	]);

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

	render(state);

	res.json({ success: true });

}

export async function saveNew(req: Request, res: Response) {
	const state = req.body.state as ProjectState;

	const metadataSchema = ProjectMetadataTransformer.toDoc(state.metadata);
	const metadataDoc = new ProjectMetadataModel(metadataSchema)
	const savedMetadataDoc = await metadataDoc.save();

	if (!savedMetadataDoc) { console.error("Failed to save new project metadata."); res.json({ success: false }); return }

	const studioSchema = ProjectStudioTransformer.toDoc(savedMetadataDoc, state.studio);
	const studioDoc = new ProjectStudioModel(studioSchema)
	const savedStudioDoc = await studioDoc.save();

	if (!savedStudioDoc) { console.error("Failed to save new project studio."); res.json({ success: false }); return }

	render(state);

	res.json({ success: true })
}

export async function load(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [metadataDoc, studioDoc] = await Promise.all([
		db.findMetadataByProjectId(projectId),
		db.findStudioByProjectId(projectId)
	]);
	if (!metadataDoc || !studioDoc) { console.error("Failed to load project metadata."); res.json({ success: false }); return }

	const state = ProjectStudioTransformer.toState(metadataDoc, studioDoc);
	res.json({ state: state })
}

export async function deleteStudio(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [resM, resS] = await Promise.all([
		db.deleteMetadataByProjectId(projectId),
		db.deleteStudioByProjectId(projectId)
	]);
	if ((resM.deletedCount+resS.deletedCount!=2)) { console.error("Failed to delete project."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function rename(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const newName = req.body.newName;
	
	const metadataDoc = await db.findMetadataByProjectId(projectId);
	if (!metadataDoc) { console.error("Failed to find project."); res.json({ success: false }); return }

	metadataDoc.title = newName;
    const savedDoc = await metadataDoc.save();
	if (!savedDoc) { console.error("Failed to save new name."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function getExport(req: Request, res: Response) {
	const audioFileData: AudioFileData = await getExportFile(req.body.projectId);
	res.json({ success: true, exportFileData: audioFileData });
}

export async function publish(req: Request, res: Response) {
	const { projectId, description } = req.body;

	const metadataDoc = await db.findMetadataByProjectId(projectId);
	if (!metadataDoc) {
		console.error('Error creating ProjectFront: No metadata found');
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create project front' 
        });
		return;
	}

    try {
		let frontDoc = await db.findFrontByProjectId(projectId);
		if (frontDoc) {
			// already released
			frontDoc.updateOne({
				description,
			})
		} else {
			// create new
			frontDoc = await ProjectFrontModel.create({
				projectId,
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

// =======================================================================
// Common pipelines

export async function render(state: ProjectState) {
	const renderer = await new Renderer(state);
	const blob = await renderer.exportProjectAsWAV();
	await putExportFile(state.metadata.projectId, blob);
}
import { Request, Response } from "express";
import { applyPatches, Patch } from "immer";
import mongoose, { Document } from "mongoose";

import { deleteMetadataByProjectId, deleteStudioByProjectId, findMetadataByProjectId, findMetadatasByUser, findStudioByProjectId } from "@src/db/mongo_client";

import { AudioFileData, ProjectState } from "@shared/types";
import { ProjectMetadataTransformer, ProjectStudioTransformer } from "@src/transformers/project.transformer";
import { ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import { getExportFile, putExportFile } from "@src/db/s3_client";
import { Renderer } from "@src/audio-processing/Renderer"


export async function getMine(req: Request, res: Response) {
	const userId = req.body.userId;
	const metadataDocs = await findMetadatasByUser(userId);
	const metadatas = metadataDocs.map((doc) => ProjectMetadataTransformer.fromDoc(doc));

	res.json({ projects: metadatas })
}

export async function saveExisting(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const patches = req.body.patches as Patch[];

	const [metadataDoc, studioDoc] = await Promise.all([
		findMetadataByProjectId(projectId),
		findStudioByProjectId(projectId)
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

	const [metadataDoc, studioDoc] = await Promise.all([
		findMetadataByProjectId(state.metadata.projectId),
		findStudioByProjectId(state.metadata.projectId)
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
		findMetadataByProjectId(projectId),
		findStudioByProjectId(projectId)
	]);
	if (!metadataDoc || !studioDoc) { console.error("Failed to load project metadata."); res.json({ success: false }); return }

	const state = ProjectStudioTransformer.toState(metadataDoc, studioDoc);
	res.json({ state: state })
}

export async function deleteStudio(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [resM, resS] = await Promise.all([
		deleteMetadataByProjectId(projectId),
		deleteStudioByProjectId(projectId)
	]);
	if ((resM.deletedCount+resS.deletedCount!=2)) { console.error("Failed to delete project."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function rename(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const newName = req.body.newName;
	
	const metadataDoc = await findMetadataByProjectId(projectId);
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

// =======================================================================
// Common pipelines

export async function render(state: ProjectState) {
	const renderer = await new Renderer(state);
	const blob = await renderer.exportProjectAsWAV();
	await putExportFile(state.metadata.projectId, blob);
}
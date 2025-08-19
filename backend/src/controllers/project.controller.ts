import { Request, Response } from "express";
import { applyPatches, Patch } from "immer";
import mongoose, { Document } from "mongoose";

import { deleteMetadataByProjectId, deleteStudioByProjectId, findMetadataByProjectId, findMetadatasByUser, findStudioByProjectId } from "@src/db/project.db";

import { ProjectMetadata, ProjectStudio } from "@shared/types";
import { ProjectMetadataTransformer, ProjectStudioTransformer } from "@src/transformers/project.transformer";
import { IProjectMetadataDocument, ProjectMetadataModel, ProjectStudioModel } from "@src/models";


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
	const state = ProjectStudioTransformer.fromDocs(studioDoc, metadataDoc)
	const stateUpdated = applyPatches(state as ProjectStudio, patches);

	const [studioSchema, metadataSchema] = ProjectStudioTransformer.toSchema(stateUpdated, studioDoc.projectMetadataId);
	Object.assign(studioDoc, studioSchema);
	Object.assign(metadataDoc, metadataSchema);

	const [savedMetadataDoc, savedStudioDoc] = await Promise.all([
		metadataDoc.save(),
		studioDoc.save(),
	]);
	if (!savedMetadataDoc) { console.error("Failed to save project metadata."); res.json({ success: false }); return }
	if (!savedStudioDoc) { console.error("Failed to save project metadata."); res.json({ success: false }); return }

	res.json({ success: true });
}

export async function saveNew(req: Request, res: Response) {
	const state = req.body.state;

	const metadataSchema = ProjectMetadataTransformer.toSchema(state.metadata);
	const metadataDoc = new ProjectMetadataModel(metadataSchema)
	const savedMetadataDoc = await metadataDoc.save();

	if (!savedMetadataDoc) { console.error("Failed to save new project metadata."); res.json({ success: false }); return }

	const [studioSchema, _] = ProjectStudioTransformer.toSchema(state, savedMetadataDoc._id as mongoose.Types.ObjectId);
	const studioDoc = new ProjectStudioModel(studioSchema)
	const savedStudioDoc = await studioDoc.save();

	if (!savedStudioDoc) { console.error("Failed to save new project studio."); res.json({ success: false }); return }

	res.json({ success: true })
}

export async function getMine(req: Request, res: Response) {
	const userId = req.body.userId;
	const metadataDocs = await findMetadatasByUser(userId);
	const metadatas = metadataDocs.map((doc) => ProjectMetadataTransformer.fromDoc(doc));

	res.json({ projects: metadatas })
}

export async function load(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [metadataDoc, studioDoc] = await Promise.all([
		findMetadataByProjectId(projectId),
		findStudioByProjectId(projectId)
	]);
	if (!metadataDoc || !studioDoc) { console.error("Failed to load project metadata."); res.json({ success: false }); return }

	const state = ProjectStudioTransformer.fromDocs(studioDoc, metadataDoc);

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

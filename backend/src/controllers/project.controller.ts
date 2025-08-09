import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { applyPatches, Patch } from "immer";
import { Document } from "mongoose";

import { newStudioSessionDb } from "../db/studio_session.db";
import { findProjectsMetadataByUser, deleteProjectStudioAndMetadataById, findProjectStudioById, newProject, renameProjectMetadataById, findProjectMetadataById, stateToProjectMetadataAndStudioDocs } from "@src/db/project.db";

import { ProjectMetadata, ProjectStudio } from "@shared/types";

export async function createSession(req: Request, res: Response) {
	const userId = req.auth?.sub;
	const sessionId = uuidv4();
	
	await newStudioSessionDb(userId, sessionId);

	res.json({ sessionId });
}

export async function saveExisting(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const patches = req.body.patches as Patch[];

	const [projectStudioDoc, projectMetadataDoc, state] = await findProjectStudioById(projectId);
	const updated = applyPatches(state as ProjectStudio, patches);

	const [projectMetadata, projectStudio] = stateToProjectMetadataAndStudioDocs(updated, projectStudioDoc.projectMetadataId);

	Object.assign(projectStudioDoc, projectStudio);
	Object.assign(projectMetadataDoc, projectMetadata);

	await (projectStudioDoc as Document).save();
	await (projectMetadataDoc as Document).save();

	res.json({ success: true });
}

export async function saveNew(req: Request, res: Response) {
	const projectState = req.body.state;
	const projectMetadata = projectState.metadata as ProjectMetadata;
	delete projectState.metadata; 
	const projectStudio = projectState as ProjectStudio;

	try {
		newProject(projectMetadata, projectStudio);
		res.json({ success: true })
	} catch (error) {
		return res.status(500).json({ error: "Failed to create new project" });
	}
}

export async function getMine(req: Request, res: Response) {
	const userId = req.body.userId;
	const [_, metadatas] = await findProjectsMetadataByUser(userId);
	res.json({ projects: metadatas })
}

export async function load(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [_, __, state] = await findProjectStudioById(projectId);
	res.json({ state: state })
}

export async function delete_studio(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const [res1, res2] = await deleteProjectStudioAndMetadataById(projectId);
	res.json({ success: (res1.deletedCount==1) && (res2.deletedCount==1) })
}

export async function rename(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const newName = req.body.newName;
	const updatedDoc = await renameProjectMetadataById(projectId, newName);
	if (updatedDoc) {
		res.json({ success: true });
	} else {
		res.json({ success: false })
	}
}

import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { newStudioSessionDb } from "../db/studio_session";
import { findProjectMetadataById, findProjectStudioById, newProject } from "@src/db/project";

import { Document } from "mongoose";

import { applyPatches } from "immer";
import { ProjectMetadata, ProjectStudio } from "@shared/types";

export async function createSession(req: Request, res: Response) {
	const userId = req.auth?.sub;
	const sessionId = uuidv4();
	
	await newStudioSessionDb(userId, sessionId);

	res.json({ sessionId });
}

export async function saveExistingProject(req: Request, res: Response) {
	const projectId = req.body.projectId;
	const patches = req.body.patches;

	const [projectStudioDoc, projectStudioObj] = await findProjectStudioById(projectId);
	if (!projectStudioDoc || !projectStudioObj) { 
		return res.status(500).json({ error: "Cannot find existing project" }); 
	};

	const updated = applyPatches(projectStudioObj, patches);
	Object.assign(projectStudioDoc, updated);

	(projectStudioDoc as Document).save();

	console.log(patches)

	res.json({ success: true });
}

export async function saveNewProject(req: Request, res: Response) {
	const projectState = req.body.state;
	const projectMetadata = projectState.metadata as ProjectMetadata;
	delete projectState.metadata; 
	const projectStudio = projectState as ProjectStudio;

	try {
		newProject(projectMetadata, projectStudio);
	} catch (error) {
		return res.status(500).json({ error: "Failed to create new project" });
	}
}
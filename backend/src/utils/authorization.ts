import { Request, Response, NextFunction } from 'express';
import { IProjectMetadataDocument, ProjectMetadataModel } from '@src/models';
import { Model } from 'mongoose';
import { ProjectMetadata } from '@shared/types';
import * as db from '../db/mongo_client'


export async function assertProjectAccess(projectId: string, userId: string): Promise<{success: boolean, metadataDoc?: IProjectMetadataDocument}> {
	const project = await db.findMetadataByProjectId(projectId);
	if (!project) {
		return {success: false};
	} else if (assertAuthorship(project, userId)) {
		return {success: true, metadataDoc: project}
	} else {
		throw new Error('Access denied: You do not have permission to access this project');
	}
}

export function assertAuthorship(project: ProjectMetadata | IProjectMetadataDocument, userId: string) {
	return project.authors.some(author => author.userId === userId)
}
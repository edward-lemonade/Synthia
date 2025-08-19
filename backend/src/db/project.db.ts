import { IProjectFrontDocument, IProjectMetadataDocument, IProjectStudioDocument, ProjectFrontModel, ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import { ProjectMetadata, ProjectFront, ProjectStudio } from "@shared/types";
import mongoose from "mongoose";

// ===========================================================
// FIND QUERIES
// ===========================================================


// METADATA QUERIES
export async function findMetadatasByUser(userId: string): Promise<IProjectMetadataDocument[]> { // TODO HANDLE MULTIPLE RETURNS
	const metadataDocs = await ProjectMetadataModel.find({"authors.userId": userId});
	return metadataDocs;
}
export async function findMetadataByProjectId(projectId: string): Promise<IProjectMetadataDocument | null> {
	const metadataDoc = await ProjectMetadataModel.findOne({projectId: projectId});
	return metadataDoc;
}
export async function findMetadataById(id: mongoose.Types.ObjectId): Promise<IProjectMetadataDocument | null> {
	const metadataDoc = await ProjectMetadataModel.findById(id);
	return metadataDoc;
}

// STUDIO QUERIES
export async function findStudioByMetadata(metadataObj: ProjectMetadata): Promise<IProjectStudioDocument | null> {
	const projectId = metadataObj.projectId;
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	return studioDoc;
}
export async function findStudioByProjectId(projectId: string): Promise<IProjectStudioDocument | null> {
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	return studioDoc;
}

// FRONT QUERIES
export async function findFrontByMetadata(metadataObj: ProjectMetadata): Promise<IProjectFrontDocument | null> {
	const projectId = metadataObj.projectId;
	const frontDoc = await ProjectFrontModel.findOne({projectId: projectId});
	return frontDoc;
}
export async function findFrontByProjectId(projectId: string): Promise<IProjectFrontDocument | null> {
	const frontDoc = await ProjectFrontModel.findOne({projectId: projectId});
	return frontDoc;
}


// ===========================================================
// DELETE QUERIES
// ===========================================================


export async function deleteMetadataByProjectId(projectId: string) {
	const res = await ProjectMetadataModel.deleteOne({ projectId: projectId });
	return res;
}
export async function deleteStudioByProjectId(projectId: string) {
	const res = await ProjectStudioModel.deleteOne({ projectId: projectId });
	return res;
}
export async function deleteFrontByProjectId(projectId: string) {
	const res = await ProjectFrontModel.deleteOne({ projectId: projectId });
	return res;
}

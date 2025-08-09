import { ProjectMetadataModel, ProjectStudioModel } from "@models/Project";
import { ProjectMetadata, ProjectFront, ProjectStudio } from "@shared/types";

// QUERIES

export async function findProjectsMetadataByUser(userId: string) { // TODO HANDLE MULTIPLE RETURNS
	const metadataDocs = await ProjectMetadataModel.find({"authors.userId": userId});
	if (!metadataDocs) return [null, null];
	const metadataObjs = metadataDocs.map(doc => doc as ProjectMetadata);
	return [metadataDocs, metadataObjs];
}

export async function findProjectMetadataById(projectId: string) {
	const metadataDoc = await ProjectMetadataModel.findOne({projectId: projectId});
	if (!metadataDoc) return [null, null];
	const metadataObj = metadataDoc as ProjectMetadata;
	return [metadataDoc, metadataObj];
}

export async function findProjectStudioByMetadata(metadataObj: ProjectMetadata) {
	const projectId = metadataObj.projectId;
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	if (!studioDoc) return [null, null];

	return [studioDoc, projectMetadataAndStudioDocsToState(metadataObj, studioDoc)];
}

export async function findProjectStudioById(projectId: string): Promise<[any, any, ProjectStudio|null]> {
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	if (!studioDoc) return [null, null, null];

	const metadataId = studioDoc.projectMetadataId;
	const metadataDoc = await ProjectMetadataModel.findById(metadataId);
	if (!metadataDoc) return [null, null, null];

	return [studioDoc, metadataDoc, projectMetadataAndStudioDocsToState(metadataDoc, studioDoc)];
}

// CREATE

export async function newProject(metadata: ProjectMetadata, studio: ProjectStudio) {
	const projectMetadata = new ProjectMetadataModel(
		metadata
	)

	let savedMetadata
	try {
		savedMetadata = await projectMetadata.save()
	} catch (error) { console.error("Error occurred while saving metadata to database: ", error) }

	const projectStudio = new ProjectStudioModel({
		projectId: metadata.projectId,
		projectMetadataId: savedMetadata!._id,
		...studio
	});

	try {
		projectStudio.save()
	} catch (error) { console.error("Error occurred while saving metadata to database: ", error) }

	console.log("Successfully saved new project", savedMetadata!._id)
}

// EDIT

export async function renameProjectMetadataById(projectId: string, newName: string) {
	const updatedDoc = await ProjectMetadataModel.findByIdAndUpdate(
		projectId, 
		{ title: newName },
		{ new: true } 
	);
	return updatedDoc;
}

// DELETE

export async function deleteProjectStudioAndMetadataById(projectId: string) {
	const res1 = await ProjectStudioModel.deleteOne({ projectId: projectId });
	const res2 = await ProjectMetadataModel.deleteOne({ projectId: projectId });
	return [res1, res2];
}

// CONVERSIONS

export function projectMetadataAndStudioDocsToState(projectMetadataDoc: any, projectStudioDoc: any) {
	const projectMetadata = projectMetadataDoc.toObject() as ProjectMetadata;
	return {
		metadata: projectMetadata,
		globals: projectStudioDoc.globals,
		tracks: projectStudioDoc.tracks,
	} as any as ProjectStudio;
}

export function stateToProjectMetadataAndStudioDocs(state: any, metadataId: string) {
	const projectMetadata = state.metadata;
	const projectStudio = {
		projectId: state.metadata.projectId,
		projectMetadataId: metadataId,
		globals: state.globals,
		tracks: state.tracks,
	}

	return [projectMetadata, projectStudio]
}
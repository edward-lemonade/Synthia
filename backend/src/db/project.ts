import { ProjectMetadataModel, ProjectStudioModel } from "@models/Project";
import { ProjectMetadata, ProjectFront, ProjectStudio } from "@shared/types";

// QUERIES

export async function findProjectsMetadataByUser(userId: string) { // TODO HANDLE MULTIPLE RETURNS
	const metadataDoc = await ProjectMetadataModel.findOne({"authors.userId": userId});
	if (!metadataDoc) return [null, null];
	const metadataObj = metadataDoc as ProjectMetadata;
	return [metadataDoc, metadataObj];
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
	return [studioDoc, projectStudioSchemaToObj(metadataObj, studioDoc)];
}

export async function findProjectStudioById(projectId: string) {
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	if (!studioDoc) return [null, null];

	const metadataId = studioDoc.projectMetadataId;
	const metadataDoc = await ProjectMetadataModel.findById(metadataId);
	if (!metadataDoc) return [null, null];
	return [studioDoc, projectStudioSchemaToObj(metadataDoc, studioDoc)];
}

// NEWS

export async function newProject(metadata: ProjectMetadata, studio: ProjectStudio) {
	const projectMetadata = new ProjectMetadataModel(
		metadata
	)

	let savedMetadata
	try {
		savedMetadata = await projectMetadata.save()
	} catch (error) { console.log("Error occurred while saving metadata to database: ", error) }

	const projectStudio = new ProjectStudioModel({
		projectId: metadata.projectId,
		projectMetadataId: savedMetadata!._id,
		...studio
	});

	try {
		projectStudio.save()
	} catch (error) { console.log("Error occurred while saving metadata to database: ", error) }

	console.log("Successfully saved new project", savedMetadata!._id)
}

// CONVERSIONS

function projectStudioSchemaToObj(projectMetadata: any, projectStudio: any) {
	delete projectStudio?.projectId;
	delete projectStudio?.projectMetadataId;
	return {
		metadata: projectMetadata as ProjectMetadata,
		...projectStudio
	} as any as ProjectStudio;
}

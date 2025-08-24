import { IProjectFrontDocument, IProjectMetadataDocument, IProjectStudioDocument, } from "@src/models";
import { BaseFile, ProjectFront, ProjectMetadata, ProjectStudio } from "@shared/types";
import mongoose from "mongoose";
import { getFile } from "@src/db/s3_client";

export class ProjectMetadataTransformer {
	static fromDoc(docMeta: IProjectMetadataDocument): ProjectMetadata {
		return docMeta.toObject();
	}
	static toDoc(objMeta: ProjectMetadata) {
		return objMeta as IProjectMetadataDocument
	}
}

export class ProjectFrontTransformer {
	static fromDocs(docMeta: IProjectMetadataDocument, docFront: IProjectFrontDocument): ProjectFront {
		const { projectId, projectMetadataId, ...rest } = docFront.toObject();

		return {
			metadata: ProjectMetadataTransformer.fromDoc(docMeta),
			...rest,
		}
	}
	static toDoc(objMeta: ProjectFront) {
		return objMeta as IProjectFrontDocument
	}
}

export class ProjectStudioTransformer {
	static toState(docMeta: IProjectMetadataDocument, docStudio: IProjectStudioDocument): {metadata: ProjectMetadata, studio: ProjectStudio} {
		const { projectId, projectMetadataId, ...rest } = docStudio.toObject();

		return {
			metadata: ProjectMetadataTransformer.fromDoc(docMeta),
			studio: {...rest},
		}
	}
	static toDoc(docMeta: IProjectMetadataDocument, objStudio: ProjectStudio): IProjectStudioDocument {
		const { _id, projectId, ...rest } = docMeta;
		const studio = {
			projectId: projectId,
			projectMetadataId: _id,
			...objStudio,
		}

		return studio as IProjectStudioDocument
	}

	static async toFrontend(objMeta: ProjectMetadata, objStudio: ProjectStudio) {
		const projectId = objMeta.projectId;

		let { files, ...rest } = objStudio;

		await Promise.all(
			files.map(async (file) => {
				file.fileData = await getFile(projectId, file.fileId);
			})
		);

		return { ...objStudio, files };
	}
}
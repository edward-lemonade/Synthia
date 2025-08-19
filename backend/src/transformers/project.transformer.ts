import { IProjectFrontDocument, IProjectMetadataDocument, IProjectStudioDocument, } from "@src/models";
import { ProjectFront, ProjectMetadata, ProjectStudio } from "@shared/types";
import mongoose from "mongoose";

export class ProjectMetadataTransformer {
	static fromDoc(docMeta: IProjectMetadataDocument): ProjectMetadata {
		return docMeta.toObject();
	}
	static toSchema(objMeta: ProjectMetadata) {
		return objMeta as IProjectMetadataDocument
	}
}

export class ProjectFrontTransformer {
	static fromDocs(docFront: IProjectFrontDocument, docMeta: IProjectMetadataDocument): ProjectFront {
		const { projectId, projectMetadataId, ...rest } = docFront.toObject();

		return {
			metadata: ProjectMetadataTransformer.fromDoc(docMeta),
			...rest,
		}
	}
}

export class ProjectStudioTransformer {
	static fromDocs(docStudio: IProjectStudioDocument, docMeta: IProjectMetadataDocument): ProjectStudio {
		const { projectId, projectMetadataId, ...rest } = docStudio.toObject();

		return {
			metadata: ProjectMetadataTransformer.fromDoc(docMeta),
			...rest,
		}
	}
	static toSchema(objState: ProjectStudio, metadataId: mongoose.Types.ObjectId): [IProjectStudioDocument, IProjectMetadataDocument] {
		const { metadata, ...rest } = objState;
		const studio = {
			projectId: objState.metadata.projectId,
			projectMetadataId: metadataId,
			...rest,
		}

		return [studio as IProjectStudioDocument, metadata as IProjectMetadataDocument]
	}
}
import mongoose, { Document } from "mongoose";
import { ProjectMetadata } from "@shared/types";

const ProjectMetadataSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String },
	createdAt: 	{ type: Date, default: Date.now },
	updatedAt: 	{ type: Date },
	title: 		{ type: String },
	authors: [{
		userId: 	{ type: String }, // auth0 userId
		username: 	{ type: String },
	}],

	isCollaboration: 	{ type: Boolean },
	isRemix: 			{ type: Boolean },
	isRemixOf: 			{ type: String, default: null },

	isReleased: {type: Boolean, default: false},
	exportFile: {type: String, default: null}
});

export interface IProjectMetadataDocument extends ProjectMetadata, Document {}

export const ProjectMetadataModel = mongoose.model<IProjectMetadataDocument>('ProjectMetadata', ProjectMetadataSchema);
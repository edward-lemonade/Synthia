import mongoose, { Document } from "mongoose";
import autopopulate from "mongoose-autopopulate";
import { ProjectMetadata } from "@shared/types";

const AuthorSchema = new mongoose.Schema({
	userId: { type: String },
}, { 
	_id: false, 
});

AuthorSchema.virtual('userRef', {
	ref: 'User',
	localField: 'userId',
	foreignField: 'auth0Id',
	justOne: true,
	autopopulate: true,
});
AuthorSchema.virtual('displayName').get(function (this: any) {
	return this.userRef?.displayName ?? null;
});
AuthorSchema.set('toObject', { 
	virtuals: true,
	transform: (_, ret) => {
		delete (ret as any).userRef;
		return ret;
	}
});
AuthorSchema.set('toJSON', { virtuals: true });


const ProjectMetadataSchema = new mongoose.Schema({
	projectId: { type: String },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date },
	title: { type: String },

	authors: [AuthorSchema],

	isCollaboration: { type: Boolean },
	isRemix: { type: Boolean },
	isRemixOf: { type: String, default: null },

	isReleased: { type: Boolean, default: false },
	exportFile: { type: String, default: null },
});
ProjectMetadataSchema.plugin(autopopulate);

export interface IProjectMetadataDocument extends ProjectMetadata, Document {}

export const ProjectMetadataModel = mongoose.model<IProjectMetadataDocument>("ProjectMetadata", ProjectMetadataSchema);

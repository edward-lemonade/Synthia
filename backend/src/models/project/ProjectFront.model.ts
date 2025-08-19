import mongoose, { Document } from "mongoose";
import { ProjectFront } from "@shared/types";

const ProjectFrontSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String, index: true },
	projectMetadataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMetadata' },
	
	release: 	{ type: String }, // EP/album
	
	description: 	{ type: String },
	access: 		{ type: String, enum: ["public", "unlisted", "private"], default: "public" }, // "public" | "unlisted" | "private"
	plays: 			{ type: Number, default: 0 },
	likes: 			{ type: Number, default: 0 },
	remixes: 		{ type: Number, default: 0 },
	saves: 			{ type: Number, default: 0 },
	playlists: 		[{ type: String }],
	comments: 		[{ type: String }],
});

export interface IProjectFrontDocument extends Document, Omit<ProjectFront, 'metadata'> {
	projectId: string,
	projectMetadataId: mongoose.Types.ObjectId, ref: 'ProjectMetadata',
}

export const ProjectFrontModel = mongoose.model<IProjectFrontDocument>('ProjectFront', ProjectFrontSchema);
import mongoose, { Document } from "mongoose";
import { ProjectStudio } from "@shared/types";
import { BaseFileRefSchema, TrackSchema } from "./Track.model";

const ProjectStudioSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String, index: true },
	projectMetadataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMetadata' },
	
	masterVolume: 	{ type: Number },
	bpm: 			{ type: Number },
	key: 			{ type: Number }, // Key enum
	centOffset: 	{ type: Number },
	timeSignature: { 
		N: { type: Number },
		D: { type: Number },
	},
	
	tracks: { type: [TrackSchema], required: true },
	fileRefs: { type: [BaseFileRefSchema], required: true }
});

export interface IProjectStudioDocument extends ProjectStudio, Document {
	projectId: string;
  	projectMetadataId: mongoose.Types.ObjectId;
}

export const ProjectStudioModel = mongoose.model<IProjectStudioDocument>('ProjectStudio', ProjectStudioSchema);
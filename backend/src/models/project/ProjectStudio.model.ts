import mongoose, { Document } from "mongoose";
import { ProjectStudio } from "@shared/types";
import { ProjectStudioGlobalsSchema } from "./ProjectStudioGlobals.model";
import { ProjectStudioTracksSchema } from "./ProjectStudioTracks.model";

const ProjectStudioSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String, index: true },
	projectMetadataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMetadata' },
	
	globals: ProjectStudioGlobalsSchema,
	tracks: ProjectStudioTracksSchema,
});

export interface IProjectStudioDocument extends Document, Omit<ProjectStudio, 'metadata'> {
	projectId: string;
  	projectMetadataId: mongoose.Types.ObjectId;
}

export const ProjectStudioModel = mongoose.model<IProjectStudioDocument>('ProjectStudio', ProjectStudioSchema);
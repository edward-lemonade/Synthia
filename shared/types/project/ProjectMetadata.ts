import { Author } from "../core";
import { ProjectFront } from "./ProjectFront";
import { ProjectStudio } from "./ProjectStudio";


export interface ProjectMetadata { // common data for frequent fetches / project page
	projectId: string;
	createdAt: Date;
	updatedAt: Date;
	title: string;
	authors: Author[];

	isCollaboration: boolean;
	isRemix: boolean;
	isRemixOf: string | null;

	isReleased: boolean;
} 

export interface ProjectState {
	metadata: ProjectMetadata,
	studio: ProjectStudio,
}

export interface ProjectReleased {
	metadata: ProjectMetadata,
	front: ProjectFront,
}
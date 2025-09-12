import { Author } from "../core";


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

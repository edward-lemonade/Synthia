import { Author } from "./Author";

export interface ProjectMetadata { // common data for frequent fetches / project page
	_id: string;
	title: string;
	authors: Author[];
	createdAt: Date;
	updatedAt: Date;

	isCollaboration: boolean;
	isRemix: boolean;
	isRemixOf: string | null;

	isReleased: boolean;
} 
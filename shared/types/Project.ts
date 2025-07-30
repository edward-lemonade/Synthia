export interface Project { // common data for frequent fetches / project page
	_id: string;
	authors: string[];
	authorIds: string[];
	title: string;
	createdAt: Date;
	updatedAt: Date;

	isCollaboration: boolean;
	isRemix: boolean;
	isRemixOf: string | null;

	isReleased: boolean;
} 

export interface ProjectFront extends Project { // public facing information for RELEASED projects
	isReleased: true;
	_releaseId: string;
	releaseDate: Date;

	collections: string; // EP/album
	
	description: string;
	access: "public" | "unlisted" | "private";
	plays: number;
	uniquePlays: number;
	likes: number;
	remixes: number;
	downloads: number;
	playlists: string[];
	comments: string[];
}


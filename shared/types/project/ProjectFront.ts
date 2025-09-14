export interface ProjectFront{ // public facing information for RELEASED projects
	release: string; // EP/album
	
	description: string;
	access: "public" | "unlisted" | "private";
	dateReleased: Date; 
	
	plays: number;
	likes: number;
	remixes: number;
	saves: number;
	playlists: string[];
	commentIds: string[];
}

export interface ProjectFrontDTO extends Omit<ProjectFront, 'dateReleased'> {
	dateReleased: string;
}
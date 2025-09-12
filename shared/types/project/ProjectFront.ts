export interface ProjectFront{ // public facing information for RELEASED projects
	release: string; // EP/album
	
	description: string;
	access: "public" | "unlisted" | "private";
	plays: number;
	likes: number;
	remixes: number;
	saves: number;
	playlists: string[];
	comments: string[];
}
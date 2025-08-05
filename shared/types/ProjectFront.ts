import { ProjectMetadata } from "./ProjectMetadata";

export interface ProjectFront{ // public facing information for RELEASED projects
	metadata: ProjectMetadata

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


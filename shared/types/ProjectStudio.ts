import { ProjectMetadata } from "./ProjectMetadata";

import { TimeSignature } from "./TimeSignature";
import { Key } from "./Key";

export interface ProjectVars {
	bpm : number;
	key : Key;
	centOffset : number;
	timeSignature : TimeSignature;
	masterVolume : number;
}

export interface AudioFile {}
export interface AudioEffect {}
export interface Region {}
export interface Track {
	// metadata
	index : number;
	name : string;
	type : "audio" | "midi";
	files : AudioFile[];
	color : string;
	
	// master settings
	volume : number;
	pan : number;
	mute : boolean;
	solo : boolean;

	// effects
	effects : AudioEffect[];

	// segments
	segments : Region[];
}
export interface ProjectTracks {
	tracks : Track[]
}

export interface ProjectStudio { // inner project data, accessible only to authors
	metadata: ProjectMetadata;
	vars: ProjectVars;
	tracks: ProjectTracks;
}
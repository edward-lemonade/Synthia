export interface Region {
	start: number; // in beats
	duration: number;
	type: "midi" | "clip"; // subclass override
	data: string[];
	fileIndex: number;
}

export interface Track {
	// metadata
	index : number;
	name : string;
	color : string;

	// subclass overrides
	type : "audio" | "microphone" | "instrument" | "drums";
	isMidi : boolean;
	instrument : string;

	// master settings
	volume : number;
	pan : number;
	mute : boolean;
	solo : boolean;

	// effects
	effects : string[];

	// data
	regions : Region[];
	files : string[];
}

export interface AudioTrack extends Track {
	// overrides
	type : "audio";
	isMidi : false;
	instrument : "none";
}
export interface MicrophoneTrack extends Track {
	// overrides
	type : "microphone";
	isMidi : false;
	instrument : "none";
}
export interface InstrumentTrack extends Track {
	// overrides
	type : "instrument";
	isMidi : true;
	instrument : string;
}
export interface DrumsTrack extends Track {
	// overrides
	type : "drums";
	isMidi : true;
	instrument : string;
}

export interface ProjectStudioTracks {
	arr: Track[];
}
export interface AudioFile {}
export interface AudioEffect {}
export interface MidiRegion {
	pitch: number;
	start: number; // in beats or seconds
	duration: number;
	velocity: number;
}
export interface ClipRegion {
	start: number; // in seconds
	duration: number;
	audioFile: string; // s3 url
}
export interface Track {
	// metadata
	index : number;
	name : string;
	type : "audio" | "microphone" | "drums" | "instrument";
	files : AudioFile | null;
	color : string;
	
	midiInstrument : string;

	// master settings
	volume : number;
	pan : number;
	mute : boolean;
	solo : boolean;

	// effects
	effects : string[];

	// segments
	midiData : MidiRegion[];
	clipData : ClipRegion[];
}
export interface ProjectStudioTracks {
	arr: Track[];
}
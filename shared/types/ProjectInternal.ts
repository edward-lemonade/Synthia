import { Project } from "./Project";

export interface ProjectInternal extends Project { // inner project data, accessible only to authors
	// MASTER SETTINGS

	bpm: number | 140;
	bpmType: "fixed" | "variable";
	bpmPoints: { time: number; bpm: number }[]; // only supports straight lines (no acceleration)

	key: string | null; 
	keyType: "fixed" | "variable";
	keyPoints: { time: number; key: string }[]; // only supports straight lines (no modulation)
	centOffset: number; // microtonal offset

	// FILES
	files: {
		[key: string]: {
			filename: string;
			mimetype: string;
			s3path?: string;
			data?: string; // optional
		};
	};

	// TRACKS
	tracks: [
		{
			id: string; // unique track ID
			name: string;
			type: "audio" | "midi";
			volume: number; // 0-1
			pan: number; // -1 (left) to 1 (right)
			mute: boolean;
			solo: boolean;
			effects: {
				type: string; // e.g., "reverb", "delay"
				settings: Record<string, any>; // effect-specific settings
			}[];
		}
	]
}

export interface Track {
	id: string; // unique track ID
	name: string;
	type: "audio" | "midi";
	volume: number; // 0-1
	pan: number; // -1 (left) to 1 (right)
	mute: boolean;
	solo: boolean;
	
	effects: {
		type: string; // e.g., "reverb", "delay"
		settings: Record<string, any>; // effect-specific settings
	}[];
	regions: AudioRegion[] | MidiRegion[];

	// AUDIO
	fileId: string | null; // original file
	// MIDI
	instrument: string | null; // e.g., "piano", "guitar"
}

export interface Region {
	id: string; // unique region ID
	startTime: number; // in seconds
	endTime: number; // in seconds
}
export interface AudioRegion extends Region {
	fileId: string; 
}
export interface MidiRegion extends Region {
	midiData: string; 
}
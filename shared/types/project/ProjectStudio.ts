import { Key, TimeSignature } from '../studio';
import { ProjectMetadata } from './ProjectMetadata';

///////////////////////////////////////////////////////////////////
// AUDIO FILE
///////////////////////////////////////////////////////////////////

export interface BaseFile {
	fileId: string;
	originalName: string;

	format: 'wav' | 'mp3' | 'flac' | 'aiff' | 'midi' | 'mid';
	type: "audio" | "midi";

	fileData?: Buffer;
}

export interface AudioFile extends BaseFile {
	format: 'wav' | 'mp3' | 'flac' | 'aiff';
	type: 'audio';

	duration: number;
	sampleRate: number;
	channels: number;
	bitDepth: number;
	
	// AUDIO DATA OR CACHE REFERENCES (key difference from backend)
	audio: {
		// Direct audio data (when loaded)
		original?: AudioBuffer;
		mp3_320?: AudioBuffer;
		mp3_128?: AudioBuffer;
		preview?: AudioBuffer;
		
		// OR cache references (when not directly loaded)
		cache: {
			original?: string;     // IndexedDB cache key
			mp3_320?: string;      // IndexedDB cache key  
			mp3_128?: string;      // IndexedDB cache key
			preview?: string;      // IndexedDB cache key
		};
		
		// Loading states
		loading: {
			original: boolean;
			mp3_320: boolean;
			mp3_128: boolean;
			preview: boolean;
		};
	};
}

export interface MidiFile extends BaseFile {
	format: 'mid' | 'midi';
	type: 'midi';
	
	midiJson?: {};
}

///////////////////////////////////////////////////////////////////
// Region
///////////////////////////////////////////////////////////////////

export interface Region {
	trackIndex: number;
	fileIndex: number;
	start: number; // in beats
	duration: number;

	type: "audio" | "midi"
}

export interface AudioRegion extends Region {
	type: "audio";
	
	// Audio slice info
	audioStartOffset: number;
	audioEndOffset: number;
	
	// Playback modifications
	volume: number;
	pitch: number;
	timeStretch: number;
	fadeIn: number;
	fadeOut: number;
}

export interface MidiRegion extends Region {
	type: "midi";
	
	midiData: []
}

///////////////////////////////////////////////////////////////////
// Track
///////////////////////////////////////////////////////////////////

export class Track {
	// metadata
	index: number = -1;
	name: string = "Track";
	color: string = "#FFFFFF";

	trackType: "audio" | "microphone" | "instrument" | "drums" = "audio";
	regionType: "audio" | "midi" = "audio";
	instrument?: string;

	// master settings
	volume: number = 100;
	pan: number = 0;
	mute: boolean = false;
	solo: boolean = false;

	// effects
	effects: string[] = [];

	// data
	regions: Region[] = [];
}

///////////////////////////////////////////////////////////////////
// ProjectStudio
///////////////////////////////////////////////////////////////////

export interface ProjectStudio {
	bpm : number;
	key : Key;
	centOffset : number;
	timeSignature : TimeSignature;
	masterVolume : number;

	tracks: Track[];
	files: BaseFile[];
}

import { TimeSignature } from '../studio/TimeSignature';
import { Key } from '../studio/Key';

export enum RegionType { Audio="audio", Midi="midi" }
export enum AudioTrackType { Audio="audio", Microphone="midi" }
export enum MidiTrackType { Instrument="instrument", Drums="drums" }
export type TrackType = AudioTrackType | MidiTrackType

export function isTrackAudio(value: any): value is AudioTrackType { return Object.values(AudioTrackType).includes(value as AudioTrackType); }
export function isTrackMidi(value: any): value is MidiTrackType { return Object.values(MidiTrackType).includes(value as MidiTrackType); }
export function regionTypeFromTrack(value: any): RegionType { return isTrackAudio(value) ? RegionType.Audio : RegionType.Midi }

// ==============================================================
// Audio file

export interface BaseFile {
	fileId: string;
	originalName: string;

	format: 'wav' | 'mp3' | 'flac' | 'aiff' | 'midi' | 'mid';
	type: RegionType;

	fileData?: Buffer;
}

export interface AudioFile extends BaseFile {
	format: 'wav' | 'mp3' | 'flac' | 'aiff';
	type: RegionType.Audio;

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
	type: RegionType.Midi;
	
	midiJson?: {};
}

// ==============================================================
// Region

export interface BaseRegion {
	trackIndex: number;
	fileIndex: number;
	start: number; // in beats
	duration: number;
}

export interface AudioRegion extends BaseRegion {
	readonly type: RegionType.Audio;
	
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

export interface MidiRegion extends BaseRegion {
	readonly type: RegionType.Midi
	
	midiData: []
}

export type Region = AudioRegion | MidiRegion;

// ==============================================================
// Track

export class Track {
	// metadata
	index: number = -1;
	name: string = "Track";
	color: string = "#FFFFFF";

	trackType: TrackType = AudioTrackType.Audio;
	regionType: RegionType = RegionType.Audio;
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

// ==============================================================
// ProjectStudio

export interface ProjectStudio {
	bpm : number;
	key : Key;
	centOffset : number;
	timeSignature : TimeSignature;
	masterVolume : number;

	tracks: Track[];
	files: BaseFile[];
}

import { TimeSignature } from '../studio/TimeSignature';
import { Key } from '../studio/Key';

export enum RegionType { Audio="audio", Midi="midi" }
export enum AudioTrackType { Audio="audio", Microphone="microphone" }
export enum MidiTrackType { Instrument="instrument", Drums="drums" }
export type TrackType = AudioTrackType | MidiTrackType

export function isTrackAudio(value: any): value is AudioTrackType { return Object.values(AudioTrackType).includes(value as AudioTrackType); }
export function isTrackMidi(value: any): value is MidiTrackType { return Object.values(MidiTrackType).includes(value as MidiTrackType); }
export function regionTypeFromTrack(value: any): RegionType { return isTrackAudio(value) ? RegionType.Audio : RegionType.Midi }

// ==============================================================
// Midi data

export interface MidiNote {
	start: number;
	midiNote: number;
	velocity: number;
	duration: number;
	channel?: number;
}

// ==============================================================
// Audio file

export interface BaseFileRef {
	fileId: string;
	mimeType: string;
	type: RegionType;
}

export interface AudioFileRef extends BaseFileRef {
	type: RegionType.Audio;
}

export interface MidiFileRef extends BaseFileRef {
	type: RegionType.Midi;
}

// ==============================================================
// Region

export interface BaseRegion {
	trackIndex: number;
	fileId: string;
	start: number; // in beats
	duration: number; // in beats
}

export interface AudioRegion extends BaseRegion {
	readonly type: RegionType.Audio;
	
	// Audio slice info
	fullStart: number; // in beats
	fullDuration: number; // in beats

	audioStartOffset: number; // in time
	audioEndOffset: number; // in time
	
	// Playback modifications
	volume: number;
	midiNote: number;
	timeStretch: number;
	fadeIn: number;
	fadeOut: number;
}

export interface MidiRegion extends BaseRegion {
	readonly type: RegionType.Midi
	
	midiData: MidiNote[]
}

export type Region = AudioRegion | MidiRegion;

// ==============================================================
// Track

export interface Track {
	// metadata
	index: number,
	name: string,
	color: string,

	trackType: TrackType,
	regionType: RegionType,
	instrument: string,

	// master settings
	volume: number,
	pan: number,
	reverb: number,
	mute: boolean,
	solo: boolean,

	// effects
	effects: string[],

	// data
	regions: Region[],
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
	fileRefs: BaseFileRef[];
}

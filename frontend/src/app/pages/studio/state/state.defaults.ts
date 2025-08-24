import { AudioRegion, AudioTrackType, Author, BaseFile, DefaultKey, DefaultTimeSignature, MidiRegion, MidiTrackType, ProjectMetadata, ProjectStudio, RegionType, Track } from "@shared/types";

export class NotSignal<T> {
  	constructor(public value: T) {}
	get() { return this.value; }
}

// ==============================================================
// Top Level

export const DEFAULT_METADATA: ProjectMetadata = {
	projectId: '',
	title: 'Untitled',
	authors: [] as Author[],
	createdAt: new Date(),
	updatedAt: new Date(),
	isCollaboration: false,
	isRemix: false,
	isRemixOf: null,
	isReleased: false,
};

export const DEFAULT_STUDIO: ProjectStudio = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,

	tracks: [] as Track[],
	files: [] as BaseFile[]
};

// ==============================================================
// Track

export const DEFAULT_AUDIO_TRACK: Track = {
	index: -1,
	name: "Track",
	color: "#FFFFFF",

	trackType: AudioTrackType.Audio,
	regionType: RegionType.Audio,

	volume: 100,
	pan: 0,
	mute: false,
	solo: false,

	effects: [],
	regions: [],
};

export const DEFAULT_MIDI_TRACK: Track = {
	index: -1,
	name: "Track",
	color: "#FFFFFF",

	trackType: MidiTrackType.Instrument,
	regionType: RegionType.Midi,
	instrument: "none",

	volume: 100,
	pan: 0,
	mute: false,
	solo: false,

	effects: [],
	regions: [],
};

// ==============================================================
// Region

export const DEFAULT_AUDIO_REGION: AudioRegion = {
	trackIndex: -1,
	fileIndex: -1,
	start: 0,
	duration: 1,

	type: RegionType.Audio,

	audioStartOffset: 0,
	audioEndOffset: -1,

	volume: 100,
	pitch: 0,
	timeStretch: 0,
	fadeIn: 0,
	fadeOut: 0,
};

export const DEFAULT_MIDI_REGION: MidiRegion = {
	trackIndex: -1,
	fileIndex: -1,
	start: 0,
	duration: 1,

	type: RegionType.Midi,

	midiData: [],
};

// ==============================================================

/*
this.state = {
	metadata: {
		projectId:	 		signal<string>(DEFAULT_METADATA.projectId),
		title: 				signal<string>(DEFAULT_METADATA.title),
		authors: 			signal<Author[]>(DEFAULT_METADATA.authors),
		createdAt: 			signal<Date>(new Date()),
		updatedAt: 			signal<Date>(new Date()),
		isCollaboration: 	signal<boolean>(DEFAULT_METADATA.isCollaboration),
		isRemix: 			signal<boolean>(DEFAULT_METADATA.isRemix),
	},
	studio: {
		bpm: stateSignal(120, "bpm", this),
		key: stateSignal(DefaultKey, "key", this),
		centOffset: stateSignal(0, "centOffset", this),
		timeSignature: stateSignal(DefaultTimeSignature, "timeSignature", this),
		masterVolume: stateSignal(100, "masterVolume", this),

		tracks: [] as Track[],
		files: [] as BaseFile[]
	}
}
*/
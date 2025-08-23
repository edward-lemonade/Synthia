import { AudioRegion, Author, BaseFile, MidiRegion, ProjectMetadata, ProjectStudio } from "@shared/types";
import { DefaultKey, DefaultTimeSignature, Track } from "@shared/types";

export const DEFAULT_METADATA_STATE: ProjectMetadata = {
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

export const DEFAULT_STUDIO_STATE: ProjectStudio = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,

	tracks: [] as Track[],
	files: [] as BaseFile[]
};

//////////////////////////////////////////////////////////
// TRACKS & REGIONS
//////////////////////////////////////////////////////////

export const DEFAULT_AUDIO_TRACK: Track = {
	index: -1,
	name: "Track",
	color: "#FFFFFF",

	trackType: "audio",
	regionType: "audio",

	volume: 100,
	pan: 0,
	mute: false,
	solo: false,

	effects: [],
	regions: [],
}
export const DEFAULT_MIDI_TRACK: Track = {
	index: -1,
	name: "Track",
	color: "#FFFFFF",

	trackType: "instrument",
	regionType: "midi",
	instrument: "",

	volume: 100,
	pan: 0,
	mute: false,
	solo: false,

	effects: [],
	regions: [],
}

export const DEFAULT_AUDIO_REGION: AudioRegion = {
	trackIndex: -1,
	fileIndex: -1,
	start: 0,
	duration: 1,
	type: "audio",

	audioStartOffset: 0,
	audioEndOffset: 0,
	
	volume: 100,
	pitch: 0,
	timeStretch: 0,
	fadeIn: 0,
	fadeOut: 0,
}
export const DEFAULT_MIDI_REGION: MidiRegion = {
	trackIndex: -1,
	fileIndex: -1,
	start: 0,
	duration: 1,
	type: "midi",

	midiData: []
}
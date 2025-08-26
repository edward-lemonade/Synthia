import { AudioRegion, AudioTrackType, Author, BaseFile, DefaultKey, DefaultTimeSignature, MidiRegion, MidiTrackType, ProjectMetadata, ProjectState, ProjectStudio, RegionType, Track } from "@shared/types";
import { StateService } from "./state.service";
import { StateNode } from "./state.factory";
import { produceWithPatches } from "immer";

import { SignalMutator } from "./state.mutators";
import * as SetterOverrides from "./state.mutators";

export type DefaultState<T extends Record<string, any>> = T & {
	_M: { [K in keyof T]?: SignalMutator<T[K], T[K]> | SignalMutator<StateNode<T[K]>[], T[K]>; }; // mutator overrides
	_U?: boolean; // allow undo/redo
};

// ==============================================================
// Top Level

export const METADATA_DEFAULTS: DefaultState<ProjectMetadata> = {
	projectId: '',
	title: 'Untitled',
	authors: [] as Author[],
	createdAt: new Date(),
	updatedAt: new Date(),
	isCollaboration: false,
	isRemix: false,
	isRemixOf: null,
	isReleased: false,

	_M: { },
	_U: false,
};

export const STUDIO_DEFAULTS: DefaultState<ProjectStudio> = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,

	tracks: [] as Track[],
	files: [] as BaseFile[],

	_M: { 
		bpm: SetterOverrides.studio_bpm_mutator,
	}
};

// ==============================================================
// Track

export const AUDIO_TRACK_DEFAULTS: DefaultState<Track> = {
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

	_M: { }
};

export const MIDI_TRACK_DEFAULTS: DefaultState<Track> = {
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

	_M: { }
};

// ==============================================================
// Region

export const AUDIO_REGION_DEFAULTS: DefaultState<AudioRegion> = {
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

	_M: { }
};

export const MIDI_REGION_DEFAULTS: DefaultState<MidiRegion> = {
	trackIndex: -1,
	fileIndex: -1,
	start: 0,
	duration: 1,

	type: RegionType.Midi,

	midiData: [],

	_M: { }
};

import { AudioRegion, AudioTrackType, Author, BaseFileRef, DefaultKey, DefaultTimeSignature, MidiRegion, MidiTrackType, ProjectMetadata, ProjectState, ProjectStudio, RegionType, Track } from "@shared/types";
import { StateService } from "./state.service";
import { Leaf, StateNode } from "./state.factory";
import { produceWithPatches } from "immer";

import { SignalMutator } from "./state.mutators";
import * as SetterOverrides from "./state.mutators";

// ==============================================================
// Modifiers

export interface BlueprintModifier<T> {
	disallowUndoRedo?: boolean,
	customLeafMutator?: SignalMutator<T, T>,
	customArrayMutator?: SignalMutator<StateNode<T>[], T>,
	asLeaf?: boolean,
}
export type Blueprint<T> = T & {
	__M?: {[K in keyof T]?: BlueprintModifier<T[K]>}
}

// ==============================================================
// Top Level

export const METADATA_DEFAULTS: Blueprint<ProjectMetadata> = {
	projectId: '',
	title: 'Untitled',
	authors: [] as Author[],
	createdAt: new Date(),
	updatedAt: new Date(),
	isCollaboration: false,
	isRemix: false,
	isRemixOf: null,
	isReleased: false,

	__M: {
		projectId: {disallowUndoRedo: true},
		title: {disallowUndoRedo: true},
		authors: {disallowUndoRedo: true},
		createdAt: {disallowUndoRedo: true},
		updatedAt: {disallowUndoRedo: true},
		isCollaboration: {disallowUndoRedo: true},
		isRemix: {disallowUndoRedo: true},
		isRemixOf: {disallowUndoRedo: true},
		isReleased: {disallowUndoRedo: true},
	}
};

export const STUDIO_DEFAULTS: Blueprint<ProjectStudio> = {
	bpm: 120,
	key: DefaultKey,
	centOffset: 0,
	timeSignature: DefaultTimeSignature,
	masterVolume: 100,

	tracks: [] as Track[],
	fileRefs: [] as BaseFileRef[],

	__M: {
		bpm: {customLeafMutator: SetterOverrides.studio_bpm_mutator},
		fileRefs: {disallowUndoRedo: true, asLeaf: true}
	}
}

// ==============================================================
// Track

export const AUDIO_TRACK_DEFAULTS: Blueprint<Track> = {
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

export const MIDI_TRACK_DEFAULTS: Blueprint<Track> = {
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

export const AUDIO_REGION_DEFAULTS: Blueprint<AudioRegion> = {
	trackIndex: -1,
	fileId: '',
	start: 0,
	duration: 1,

	type: RegionType.Audio,

	fullStart: 0,
	fullDuration: 0,

	audioStartOffset: 0,
	audioEndOffset: -1,

	volume: 100,
	pitch: 0,
	timeStretch: 0,
	fadeIn: 0,
	fadeOut: 0,
};

export const MIDI_REGION_DEFAULTS: MidiRegion = {
	trackIndex: -1,
	fileId: '',
	start: 0,
	duration: 1,

	type: RegionType.Midi,

	midiData: [],
};

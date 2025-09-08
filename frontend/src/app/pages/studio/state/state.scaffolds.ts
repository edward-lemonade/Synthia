import { AudioFileRef, AudioRegion, AudioTrackType, Author, BaseFileRef, DefaultKey, DefaultTimeSignature, Key, MidiNote, MidiRegion, MidiTrackType, ProjectMetadata, ProjectState, ProjectStudio, RegionType, TimeSignature, Track } from "@shared/types";
import { NodeType } from "./state.factory";
import { ArrayMutator, Mutator } from "./state.mutators";
import * as M from "./state.mutators"


export interface Scaffold<T> {
	_type: NodeType;
}

export interface PropScaffold<T> extends Scaffold<T> {
	_type: NodeType.Prop;
	value: T;
	mutator: Mutator<T>;
}

export type ObjectScaffold<T extends Record<string, any>> = Scaffold<T> & {
	_type: NodeType.Object;
} & {
	[K in keyof T]: Scaffold<T[K]>;
};

export interface ArrayScaffold<T extends Record<string, any>> extends Scaffold<T[]> {
	_type: NodeType.Array;
	value: T[];
	mutator: ArrayMutator<T>;
	scaffold: (el: Partial<T>) => ObjectScaffold<T>;
}


// ==============================================================
// Top Level

export const STATE_SCAFFOLD = {
	_type: NodeType.Object,
	metadata: {
		_type: NodeType.Object,
		projectId: 			{_type: NodeType.Prop, value: ''} as PropScaffold<string>,
		title: 				{_type: NodeType.Prop, value: 'Untitled', mutator: M.setTitle} as PropScaffold<string>,
		authors: 			{_type: NodeType.Prop, value: [] as Author[], mutator: M.setAuthors} as PropScaffold<Author[]>,
		createdAt: 			{_type: NodeType.Prop, value: new Date()} as PropScaffold<Date>,
		updatedAt: 			{_type: NodeType.Prop, value: new Date(), mutator: M.setUpdatedAt} as PropScaffold<Date>,
		isCollaboration: 	{_type: NodeType.Prop, value: false, mutator: M.setIsCollaboration} as PropScaffold<boolean>,
		isRemix: 			{_type: NodeType.Prop, value: false, mutator: M.setIsRemix} as PropScaffold<boolean>,
		isRemixOf: 			{_type: NodeType.Prop, value: null, mutator: M.setIsRemixOf} as PropScaffold<string | null>,
		isReleased: 		{_type: NodeType.Prop, value: false, mutator: M.setIsReleased} as PropScaffold<boolean>,
	} as ObjectScaffold<ProjectMetadata>,
	studio: {
		_type: NodeType.Object,
		bpm: 				{_type: NodeType.Prop, value: 120, mutator: M.setBpm} as PropScaffold<number>,
		key: 				{_type: NodeType.Prop, value: DefaultKey, mutator: M.setKey} as PropScaffold<Key>,
		centOffset: 		{_type: NodeType.Prop, value: 0, mutator: M.setCentOffset} as PropScaffold<number>,
		timeSignature: 		{_type: NodeType.Prop, value: DefaultTimeSignature, mutator: M.setTimeSignature} as PropScaffold<TimeSignature>,
		masterVolume: 		{_type: NodeType.Prop, value: 100, mutator: M.setMasterVolume} as PropScaffold<number>,
		fileRefs: 			{_type: NodeType.Prop, value: [], mutator: M.setFileRefs} as PropScaffold<BaseFileRef[]>,
		tracks: 			{_type: NodeType.Array, value: [], mutator: M.setTracks, scaffold: (el: Partial<Track>) => (el.regionType!) == RegionType.Audio ? AUDIO_TRACK_SCAFFOLD : MIDI_TRACK_SCAFFOLD} as ArrayScaffold<Track>,
	} as ObjectScaffold<ProjectStudio>,
} as ObjectScaffold<ProjectState>;

// ==============================================================
// Track

export const TRACK_SCAFFOLD = {
	_type: NodeType.Object,
	index: 		{_type: NodeType.Prop, value: -1, mutator: M.setTrackIndex} as PropScaffold<number>,
	name: 		{_type: NodeType.Prop, value: "Track", mutator: M.setTrackName} as PropScaffold<string>,
	color: 		{_type: NodeType.Prop, value: "#FFFFFF", mutator: M.setTrackColor} as PropScaffold<string>,
	volume: 	{_type: NodeType.Prop, value: 100, mutator: M.setTrackVolume} as PropScaffold<number>,
	pan: 		{_type: NodeType.Prop, value: 0, mutator: M.setTrackPan} as PropScaffold<number>,
	reverb: 	{_type: NodeType.Prop, value: 0, mutator: M.setTrackReverb} as PropScaffold<number>,
	mute: 		{_type: NodeType.Prop, value: false, mutator: M.setTrackMute} as PropScaffold<boolean>,
	solo: 		{_type: NodeType.Prop, value: false, mutator: M.setTrackSolo} as PropScaffold<boolean>,
	effects: 	{_type: NodeType.Prop, value: [], mutator: M.setTrackEffects} as PropScaffold<string[]>,
}

export const AUDIO_TRACK_SCAFFOLD = {
	...TRACK_SCAFFOLD,
	trackType: 	{_type: NodeType.Prop, value: AudioTrackType.Audio} as PropScaffold<AudioTrackType>,
	regionType: {_type: NodeType.Prop, value: RegionType.Audio} as PropScaffold<RegionType>,
	instrument: {_type: NodeType.Prop, value: "none", mutator: M.setTrackInstrument} as PropScaffold<string>,
	regions: 	{_type: NodeType.Array, value: [], mutator: M.setTrackRegions, scaffold: (el: AudioRegion) => AUDIO_REGION_SCAFFOLD} as ArrayScaffold<AudioRegion>,
} as ObjectScaffold<Track>;

export const MIDI_TRACK_SCAFFOLD = {
	...TRACK_SCAFFOLD,
	trackType: 	{_type: NodeType.Prop, value: MidiTrackType.Instrument} as PropScaffold<MidiTrackType>,
	regionType: {_type: NodeType.Prop, value: RegionType.Midi} as PropScaffold<RegionType>,
	instrument: {_type: NodeType.Prop, value: "Golden Synth", mutator: M.setTrackInstrument} as PropScaffold<string>,
	regions: 	{_type: NodeType.Array, value: [], mutator: M.setTrackRegions, scaffold: (el: MidiRegion) => MIDI_REGION_SCAFFOLD} as ArrayScaffold<MidiRegion>,
} as ObjectScaffold<Track>;

// ==============================================================
// Region

export const REGION_SCAFFOLD = {
	_type: NodeType.Object,
	trackIndex: 		{_type: NodeType.Prop, value: -1, mutator: M.setRegionTrackIndex} as PropScaffold<number>,
	fileId: 			{_type: NodeType.Prop, value: '', mutator: M.setRegionFileId} as PropScaffold<string>,
	start: 				{_type: NodeType.Prop, value: 0, mutator: M.setRegionStart} as PropScaffold<number>,
	duration: 			{_type: NodeType.Prop, value: 1, mutator: M.setRegionDuration} as PropScaffold<number>,
}

export const AUDIO_REGION_SCAFFOLD = {
	...REGION_SCAFFOLD,
	type: 				{_type: NodeType.Prop, value: RegionType.Audio} as PropScaffold<RegionType>,
	fullStart: 			{_type: NodeType.Prop, value: 0, mutator: M.setRegionFullStart} as PropScaffold<number>,
	fullDuration: 		{_type: NodeType.Prop, value: 0, mutator: M.setRegionFullDuration} as PropScaffold<number>,
	audioStartOffset: 	{_type: NodeType.Prop, value: 0, mutator: M.setRegionAudioStartOffset} as PropScaffold<number>,
	audioEndOffset: 	{_type: NodeType.Prop, value: -1, mutator: M.setRegionAudioEndOffset} as PropScaffold<number>,
	volume: 			{_type: NodeType.Prop, value: 100, mutator: M.setRegionVolume} as PropScaffold<number>,
	midiNote: 				{_type: NodeType.Prop, value: 0, mutator: M.setRegionMidiNote} as PropScaffold<number>,
	timeStretch: 		{_type: NodeType.Prop, value: 0, mutator: M.setRegionTimeStretch} as PropScaffold<number>,
	fadeIn: 			{_type: NodeType.Prop, value: 0, mutator: M.setRegionFadeIn} as PropScaffold<number>,
	fadeOut: 			{_type: NodeType.Prop, value: 0, mutator: M.setRegionFadeOut} as PropScaffold<number>,
} as ObjectScaffold<AudioRegion>;

export const MIDI_REGION_SCAFFOLD = {
	...REGION_SCAFFOLD,
	type: 				{_type: NodeType.Prop, value: RegionType.Midi} as PropScaffold<RegionType>,
	midiData: 			{_type: NodeType.Array, value: [], mutator: M.setMidiNotes, scaffold: (el: MidiNote) => MIDI_NOTE_SCAFFOLD} as ArrayScaffold<MidiNote>,
} as ObjectScaffold<MidiRegion>;

// ==============================================================
// Midi note

export const MIDI_NOTE_SCAFFOLD = {
	_type: NodeType.Object,
	start: 		{_type: NodeType.Prop, value: 0, mutator: M.setMidiNoteTime} as PropScaffold<number>,
	midiNote: 	{_type: NodeType.Prop, value: 0, mutator: M.setMidiNoteMidiNote} as PropScaffold<number>,
	velocity: 	{_type: NodeType.Prop, value: 127, mutator: M.setMidiNoteVelocity} as PropScaffold<number>,
	duration: 	{_type: NodeType.Prop, value: 0, mutator: M.setMidiNoteDuration} as PropScaffold<number>,
	channel: 	{_type: NodeType.Prop, value: 0, mutator: M.setMidiNoteChannel} as PropScaffold<number>,
} as ObjectScaffold<MidiNote>;
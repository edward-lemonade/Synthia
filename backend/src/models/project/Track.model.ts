import { Region, Track, BaseFileRef } from '@shared/types';
import { Schema } from 'mongoose';

export enum RegionType { Audio="audio", Midi="midi" }
export enum AudioTrackType { Audio="audio", Microphone="microphone" }
export enum MidiTrackType { Instrument="instrument", Drums="drums" }
export type TrackType = AudioTrackType | MidiTrackType


export const BaseFileRefSchema = new Schema<BaseFileRef>({
	fileId: { type: String, required: true },
	mimeType: { type: String, required: true },
	type: { type: String, required: true },
}, { _id: false });

const BaseRegionSchema = new Schema<Region>({
	trackIndex: { type: Number, required: true },
	fileId: { type: String},
	start: { type: Number, required: true },
	duration: { type: Number, required: true },
	type: { 
		type: String, 
		enum: Object.values(RegionType), 
		required: true 
	}
}, { 
	discriminatorKey: 'type',
	_id: false 
});

const AudioRegionSchema = BaseRegionSchema.discriminator('audio', new Schema({
	fullStart: { type: Number, required: true },
	fullDuration: { type: Number, required: true },
	audioStartOffset: { type: Number, required: true },
	audioEndOffset: { type: Number, required: true },
	volume: { type: Number, required: true },
	pitch: { type: Number, required: true },
	timeStretch: { type: Number, required: true },
	fadeIn: { type: Number, required: true },
	fadeOut: { type: Number, required: true }
}, { _id: false }));

const MidiRegionSchema = BaseRegionSchema.discriminator('midi', new Schema({
	midiData: { type: [], required: true }
}, { _id: false }));

export const TrackSchema = new Schema<Track>({
	index: { type: Number, required: true, default: -1 },
	name: { type: String, required: true, default: "Track" },
	color: { type: String, required: true, default: "#FFFFFF" },
	trackType: { 
		type: String, 
		enum: [...Object.values(AudioTrackType), ...Object.values(MidiTrackType)], 
		required: true,
		default: AudioTrackType.Audio
	},
	regionType: { 
		type: String, 
		enum: Object.values(RegionType), 
		required: true,
		default: RegionType.Audio
	},
	instrument: { type: String, required: false },
	volume: { type: Number, required: true, default: 100 },
	pan: { type: Number, required: true, default: 0 },
	reverb: { type: Number, required: true, default: 0 },
	mute: { type: Boolean, required: true, default: false },
	solo: { type: Boolean, required: true, default: false },
	effects: { type: [String], required: true, default: [] },
	regions: { type: [BaseRegionSchema], required: true, default: [] }
}, { _id: false });

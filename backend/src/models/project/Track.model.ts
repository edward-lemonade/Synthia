import { Region, Track, BaseFile } from '@shared/types';
import { Schema } from 'mongoose';

export enum RegionType { Audio="audio", Midi="midi" }
export enum AudioTrackType { Audio="audio", Microphone="midi" }
export enum MidiTrackType { Instrument="instrument", Drums="drums" }
export type TrackType = AudioTrackType | MidiTrackType


export const BaseFileSchema = new Schema<BaseFile>({
	fileId: { type: String, required: true },
	originalName: { type: String, required: true },
	format: { 
		type: String, 
		enum: ['wav', 'mp3', 'flac', 'aiff', 'midi', 'mid'], 
		required: true 
	},
	type: { 
		type: String, 
		enum: ["audio", "midi"], 
		required: true 
	},
}, { _id: false });

const BaseRegionSchema = new Schema<Region>({
	trackIndex: { type: Number, required: true },
	fileIndex: { type: Number, required: true },
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
	mute: { type: Boolean, required: true, default: false },
	solo: { type: Boolean, required: true, default: false },
	effects: { type: [String], required: true, default: [] },
	regions: { type: [BaseRegionSchema], required: true, default: [] }
}, { _id: false });

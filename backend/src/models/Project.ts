import mongoose from "mongoose";

import { ProjectMetadata } from "@shared/types";
import { ProjectFront } from "@shared/types";
import { ProjectStudio } from "@shared/types";

const ProjectMetadataSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String },
	createdAt: 	{ type: Date, default: Date.now },
	updatedAt: 	{ type: Date },
	title: 		{ type: String },
	authors: [{
		userId: 	{ type: String }, // auth0 userId
		username: 	{ type: String },
	}],

	isCollaboration: 	{ type: Boolean },
	isRemix: 			{ type: Boolean },
	isRemixOf: 			{ type: String, default: null },

	isReleased: {type: Boolean, default: false},
});

const ProjectFrontSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String },
	projectMetadataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMetadata' },
	
	release: 	{ type: String }, // EP/album
	
	description: 	{ type: String },
	access: 		{ type: String, enum: ["public", "unlisted", "private"], default: "public" }, // "public" | "unlisted" | "private"
	plays: 			{ type: Number, default: 0 },
	likes: 			{ type: Number, default: 0 },
	remixes: 		{ type: Number, default: 0 },
	saves: 			{ type: Number, default: 0 },
	playlists: 		[{ type: String }],
	comments: 		[{ type: String }],
});

const ProjectStudioSchema = new mongoose.Schema({ // interface ProjectMetadata
	projectId: 	{ type: String },
	projectMetadataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectMetadata' },
	
	globals: {
		masterVolume: 	{ type: Number },
		bpm: 			{ type: Number },
		key: 			{ type: Number }, // Key enum
		centOffset: 	{ type: Number },
		timeSignature: { 
			N: { type: Number },
			D: { type: Number },
		},
	},

	tracks: {
		arr: [{
			index: 	{ type: Number },
			name: 	{ type: String },
			type:  	{ type: String, enum: ["audio", "microphone", "drums", "instrument"], default: "audio" },
			audioFile: 	{ type: String }, // s3 url
			color: 		{ type: String },

			midiInstrument: { type: String },
			
			// master settings
			volume: { type: Number },
			pan:	{ type: Number },
			mute: 	{ type: Boolean },
			solo: 	{ type: Boolean },
		
			// effects
			effects: 	[{ type: String }],
		
			// regions
			midiData: [{
				pitch: Number,
				start: Number, // in beats or seconds
				duration: Number,
				velocity: Number
			}],
			clipData: [{
				start: Number, // in seconds
				duration: Number,
				audioFile: String, // s3 url
			}]
		}],
	}

	// TODO: automations
});

export const ProjectMetadataModel = mongoose.model('ProjectMetadata', ProjectMetadataSchema);
export const ProjectFrontModel = mongoose.model('ProjectFront', ProjectFrontSchema);
export const ProjectStudioModel = mongoose.model('ProjectStudio', ProjectStudioSchema);
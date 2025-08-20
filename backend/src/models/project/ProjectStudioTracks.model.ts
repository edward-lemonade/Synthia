import mongoose from 'mongoose';

const RegionSchema = new mongoose.Schema({
	start: { type: Number, required: true }, // in beats
	duration: { type: Number, required: true },
	isMidi: { type: Boolean, required: true },
	data: [{ type: String, required: true }],
	fileIndex: { type: Number, required: true },
}, { _id: false });

const TrackSchema = new mongoose.Schema({
	// metadata
	index: { type: Number, required: true },
	name: { type: String, required: true },
	color: { type: String, required: true },

	// subclass overrides
	type: { 
		type: String, 
		enum: ['audio', 'microphone', 'instrument', 'drums'], 
		required: true 
	},
	isMidi: { type: Boolean, required: true },
	instrument: { type: String },

	// master settings
	volume: { type: Number, required: true, default: 1.0 },
	pan: { type: Number, required: true, default: 0.0 },
	mute: { type: Boolean, required: true, default: false },
	solo: { type: Boolean, required: true, default: false },

	// effects
	effects: [{ type: String }],

	// data
	regions: [RegionSchema], // Base regions array
	files: [{ type: String }]
}, { _id: false });

export const ProjectStudioTracksSchema = new mongoose.Schema({
	arr: [TrackSchema]
}, { _id: false });
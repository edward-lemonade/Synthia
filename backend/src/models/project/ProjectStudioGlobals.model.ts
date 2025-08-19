import mongoose from 'mongoose';

export const ProjectStudioGlobalsSchema = new mongoose.Schema({
	masterVolume: 	{ type: Number },
	bpm: 			{ type: Number },
	key: 			{ type: Number }, // Key enum
	centOffset: 	{ type: Number },
	timeSignature: { 
		N: { type: Number },
		D: { type: Number },
	},
});
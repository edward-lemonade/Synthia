import mongoose from "mongoose";

const StudioSessionSchema = new mongoose.Schema({
	userId: 	{ type: String },
	sessionId: 	{ type: String },
	createdAt: 	{ type: Date, default: Date.now, expires: 3600 } // expires after 1 hour
});

export const StudioSession = mongoose.model('StudioSession', StudioSessionSchema);
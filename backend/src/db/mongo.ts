import { MONGO_STRING } from "@src/env";

import mongoose from "mongoose";

export async function connectMongo() {
	try {
		mongoose.connect(MONGO_STRING as string);
		console.log('MongoDB connected');
	} catch (err) {
		console.error('MongoDB connection failed:', err);
		process.exit(1);
	}
}
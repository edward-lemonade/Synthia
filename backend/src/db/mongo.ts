import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config({ path: './.env' }); 

export async function connectMongo() {
	try {
		mongoose.connect(process.env.MONGO_STRING as string);
		console.log('MongoDB connected');
	} catch (err) {
		console.error('MongoDB connection failed:', err);
		process.exit(1);
	}
}
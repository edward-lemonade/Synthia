import { Like } from "@shared/types";
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import autopopulate from 'mongoose-autopopulate';

const LikeSchema = new mongoose.Schema({ // interface ProjectMetadata
	likeId: 		{ type: String, default: uuidv4, unique: true, index: true },
	projectId: 		{ type: String },
	userId: 		{ type: String },

	createdAt: 	{ type: Date, default: Date.now },
}, {
	timestamps: true,
});

export interface ILikeDocument extends Document, Like {}

export const LikeModel = mongoose.model<Like>('Like', LikeSchema);
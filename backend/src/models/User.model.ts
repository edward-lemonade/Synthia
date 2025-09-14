import { User } from "@shared/types";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
	auth0Id: { type: String, required: true, unique: true, index: true },
	displayName: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		minlength: 1,
		maxlength: 30,
		match: /^[a-zA-Z0-9_]+$/
	},
	bio: {
		type: String,
		default: '',
		maxlength: 200,
	},
	
	// Social features
	comments: 	[{ type: String, ref: 'Comment' }],
	likes: 		[{ type: String }],
	followers: 	[{ type: String }],
	following: 	[{ type: String }],

	createdAt: { type: Date, default: Date.now },
	lastLoginAt: { type: Date, default: null }
}, {
	timestamps: true, // automatically manages createdAt and updatedAt
});

export interface IUserDocument extends Document, User {}

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
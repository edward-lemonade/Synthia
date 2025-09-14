import { Comment } from "@shared/types";
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import autopopulate from 'mongoose-autopopulate';

const CommentSchema = new mongoose.Schema({ // interface ProjectMetadata
	commentId: 		{ type: String, default: uuidv4(), unique: true, index: true },
	projectId: 		{ type: String },
	userId: 		{ type: String },
	content: 		{ type: String },

	createdAt: 	{ type: Date, default: Date.now },
	updatedAt: 	{ type: Date, default: Date.now },
}, {
	timestamps: true,
});

CommentSchema.virtual('userRef', {
	ref: 'User',
	localField: 'userId',
	foreignField: 'auth0Id',
	justOne: true,
	autopopulate: true,
});
CommentSchema.virtual('displayName').get(function (this: any) {
  	return this.userRef?.displayName ?? null;
});
CommentSchema.set('toObject', { 
	virtuals: true,
	transform: (_, ret) => {
		delete (ret as any).userRef;
		return ret;
	}
});
CommentSchema.set('toJSON', { virtuals: true });
CommentSchema.plugin(autopopulate);


export interface ICommentDocument extends Document, Comment {}

export const CommentModel = mongoose.model<Comment>('Comment', CommentSchema);
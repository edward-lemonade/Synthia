import { IProjectFrontDocument, IProjectMetadataDocument, IProjectStudioDocument, ProjectFrontModel, ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import { ProjectMetadata, ProjectFront, ProjectStudio } from "@shared/types";
import mongoose from "mongoose";

import { MONGO_STRING } from "@src/env";
import { UserModel } from "@src/models/User.model";
import { CommentModel } from "@src/models/Comment.model";

export async function connectMongo() {
	try {
		mongoose.connect(MONGO_STRING as string);
		console.log('MongoDB connected');
	} catch (err) {
		console.error('MongoDB connection failed:', err);
		process.exit(1);
	}
}

// ===========================================================
// FIND QUERIES
// ===========================================================


// METADATA QUERIES
export async function findMetadatasByUser(userId: string): Promise<IProjectMetadataDocument[]> { // TODO HANDLE MULTIPLE RETURNS
	const metadataDocs = await ProjectMetadataModel.find({"authors.userId": userId});
	return metadataDocs;
}
export async function findMetadataByProjectId(projectId: string): Promise<IProjectMetadataDocument | null> {
	const metadataDoc = await ProjectMetadataModel.findOne({projectId: projectId});
	return metadataDoc;
}
export async function findMetadataById(id: mongoose.Types.ObjectId): Promise<IProjectMetadataDocument | null> {
	const metadataDoc = await ProjectMetadataModel.findById(id);
	return metadataDoc;
}

// STUDIO QUERIES
export async function findStudioByMetadata(metadataObj: ProjectMetadata): Promise<IProjectStudioDocument | null> {
	const projectId = metadataObj.projectId;
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	return studioDoc;
}
export async function findStudioByProjectId(projectId: string): Promise<IProjectStudioDocument | null> {
	const studioDoc = await ProjectStudioModel.findOne({projectId: projectId});
	return studioDoc;
}

// FRONT QUERIES
export async function findFrontByMetadata(metadataObj: ProjectMetadata): Promise<IProjectFrontDocument | null> {
	const projectId = metadataObj.projectId;
	const frontDoc = await ProjectFrontModel.findOne({projectId: projectId});
	return frontDoc;
}
export async function findFrontByProjectId(projectId: string): Promise<IProjectFrontDocument | null> {
	const frontDoc = await ProjectFrontModel.findOne({projectId: projectId});
	return frontDoc;
}


// ===========================================================
// DELETE QUERIES
// ===========================================================


export async function deleteMetadataByProjectId(projectId: string) {
	const res = await ProjectMetadataModel.deleteOne({ projectId: projectId });
	return res;
}
export async function deleteStudioByProjectId(projectId: string) {
	const res = await ProjectStudioModel.deleteOne({ projectId: projectId });
	return res;
}
export async function deleteFrontByProjectId(projectId: string) {
	const res = await ProjectFrontModel.deleteOne({ projectId: projectId });
	return res;
}

// ===========================================================
// TRACK STATS
// ===========================================================

export async function hasLikedTrack(projectId: string, userId: string) {
	const user = await UserModel.findOne({ auth0Id: userId }).select('likes');
	if (!user) {return false}
	const liked = user.likes.includes(projectId);
	return liked;
}

export async function doUserLike(projectId: string, userId: string) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		const userResult = await UserModel.updateOne(
			{ auth0Id: userId },
			{ $addToSet: { likes: projectId } }, // $addToSet prevents duplicates
			{ session }
		);
		
		if (userResult.modifiedCount > 0) {
			await ProjectFrontModel.updateOne(
				{ projectId },
				{ $inc: { likes: 1 } },
				{ session }
			);
		}
		
		await session.commitTransaction();
		return userResult.modifiedCount > 0; // returns true if like was added
	} catch (error) {
		await session.abortTransaction();
		console.error('Error creating user like:', error);
		throw error;
	} finally {
		session.endSession();
	}
}

export async function doUserUnlike(projectId: string, userId: string) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		const userResult = await UserModel.updateOne(
			{ auth0Id: userId },
			{ $pull: { likes: projectId } },
			{ session }
		);
		
		if (userResult.modifiedCount > 0) {
			await ProjectFrontModel.updateOne(
				{ projectId },
				{ $inc: { likes: -1 } },
				{ session }
			);
		}
		
		await session.commitTransaction();
		return userResult.modifiedCount > 0; // returns true if like was removed
	} catch (error) {
		await session.abortTransaction();
		console.error('Error deleting user like:', error);
		throw error;
	} finally {
		session.endSession();
	}
}

export async function doUserPlay(projectId: string, userId: string, timestamp: number) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		// Add the projectId to user's plays array (allows duplicates for multiple plays)
		const userResult = await UserModel.updateOne(
			{ userId },
			{ $push: { plays: projectId } },
			{ session }
		);
		
		// Increment the project's play count
		await ProjectFrontModel.updateOne(
			{ projectId },
			{ $inc: { plays: 1 } },
			{ session }
		);
		
		await session.commitTransaction();
		return userResult.modifiedCount > 0;
	} catch (error) {
		await session.abortTransaction();
		console.error('Error creating user play:', error);
		throw error;
	} finally {
		session.endSession();
	}
}

export async function getTrackComments(projectId: string) {
	try {
		const comments = await CommentModel.find({
			projectId,
		})
		.sort({ createdAt: -1 }) // Most recent first
		.exec();

		return comments;
	} catch (error) {
		console.error('Error finding recent user comments:', error);
		throw error;
	}
}

export async function createUserComment(projectId: string, userId: string, comment: string, timestamp: number) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		// Create the comment
		const newComment = new CommentModel({
			projectId,
			userId,
			content: comment,
			createdAt: new Date(timestamp),
			updatedAt: new Date(timestamp)
		});
		
		await newComment.save({ session });
		
		// Add the comment's ObjectId to user's comments array
		await UserModel.updateOne(
			{ userId },
			{ $push: { comments: newComment.commentId } },
			{ session }
		);
		
		// Add the comment ID to the project's comments array
		await ProjectFrontModel.updateOne(
			{ projectId },
			{ $push: { commentIds: newComment.commentId } },
			{ session }
		);
		
		await session.commitTransaction();
		return newComment;
	} catch (error) {
		await session.abortTransaction();
		console.error('Error creating user comment:', error);
		throw error;
	} finally {
		session.endSession();
	}
}

export async function findRecentUserComments(projectId: string, userId: string, timeWindowMs: number) {
	try {
		const cutoffTime = new Date(Date.now() - timeWindowMs);
		
		const comments = await CommentModel.find({
			projectId,
			userId,
			createdAt: { $gte: cutoffTime }
		})
		.sort({ createdAt: -1 }) // Most recent first
		.exec();
		
		return comments;
	} catch (error) {
		console.error('Error finding recent user comments:', error);
		throw error;
	}
}
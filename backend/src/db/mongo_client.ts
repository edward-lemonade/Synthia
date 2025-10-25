import { IProjectFrontDocument, IProjectMetadataDocument, IProjectStudioDocument, ProjectFrontModel, ProjectMetadataModel, ProjectStudioModel } from "@src/models";
import { ProjectMetadata, ProjectFront, ProjectStudio } from "@shared/types";
import mongoose, { ClientSession } from "mongoose";

import { AUTH0_DOMAIN, MONGO_STRING } from "@src/env";
import { UserModel } from "@src/models/User.model";
import { CommentModel } from "@src/models/Comment.model";
import { LikeModel } from "@src/models/Like.model";

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
export async function findMetadatasByUser(userId: string, session?: ClientSession): Promise<IProjectMetadataDocument[]> { // TODO HANDLE MULTIPLE RETURNS
	const query = ProjectMetadataModel.find({"authors.userId": userId});
	if (session) {
		query.session(session);
	}
	const metadataDocs = await query;
	return metadataDocs;
}
export async function findMetadataByProjectId(projectId: string, session?: ClientSession): Promise<IProjectMetadataDocument | null> {
	const query = ProjectMetadataModel.findOne({projectId: projectId});
	if (session) {
		query.session(session);
	}
	const metadataDoc = await query;
	return metadataDoc;
}
export async function findMetadataById(id: mongoose.Types.ObjectId, session?: ClientSession): Promise<IProjectMetadataDocument | null> {
	const query = ProjectMetadataModel.findById(id);
	if (session) {
		query.session(session);
	}
	const metadataDoc = await query;
	return metadataDoc;
}

// STUDIO QUERIES
export async function findStudioByMetadata(metadataObj: ProjectMetadata, session?: ClientSession): Promise<IProjectStudioDocument | null> {
	const projectId = metadataObj.projectId;
	const query = ProjectStudioModel.findOne({projectId: projectId});
	if (session) {
		query.session(session);
	}
	const studioDoc = await query;
	return studioDoc;
}
export async function findStudioByProjectId(projectId: string, session?: ClientSession): Promise<IProjectStudioDocument | null> {
	const query = ProjectStudioModel.findOne({projectId: projectId});
	if (session) {
		query.session(session);
	}
	const studioDoc = await query;
	return studioDoc;
}

// FRONT QUERIES
export async function findFrontByMetadata(metadataObj: ProjectMetadata, session?: ClientSession): Promise<IProjectFrontDocument | null> {
	const projectId = metadataObj.projectId;
	const query = ProjectFrontModel.findOne({projectId: projectId});
	if (session) {
		query.session(session);
	}
	const frontDoc = await query;
	return frontDoc;
}
export async function findFrontByProjectId(projectId: string, session?: ClientSession): Promise<IProjectFrontDocument | null> {
	const query = ProjectFrontModel.findOne({projectId: projectId});
	if (session) {
		query.session(session);
	}
	const frontDoc = await query;
	return frontDoc;
}


// ===========================================================
// DELETE QUERIES
// ===========================================================


export async function deleteMetadataByProjectId(projectId: string, session?: ClientSession) {
	const query = ProjectMetadataModel.deleteOne({ projectId: projectId });
	if (session) {
		query.session(session);
	}
	const res = await query;
	return res;
}

export async function deleteStudioByProjectId(projectId: string, session?: ClientSession) {
	const query = ProjectStudioModel.deleteOne({ projectId: projectId });
	if (session) {
		query.session(session);
	}
	const res = await query;
	return res;
}

export async function deleteFrontByProjectId(projectId: string, session?: ClientSession) {
	const query = ProjectFrontModel.deleteOne({ projectId: projectId });
	if (session) {
		query.session(session);
	}
	const res = await query;
	return res;
}

// ===========================================================
// TRACK STATS
// ===========================================================

export async function hasLikedTrack(projectId: string, userId: string, session?: ClientSession) {
	if (!userId) {return null}
	const query = LikeModel.findOne({ userId, projectId }).select('likes');
	if (session) {
		query.session(session);
	}
	const like = await query;
	return like;
}

export async function createUserLike(projectId: string, userId: string) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		// Check if like already exists
		const existingLike = await LikeModel.findOne({ projectId, userId });
		if (existingLike) {
			await session.abortTransaction();
			return false; // Like already exists
		}

		const newLike = new LikeModel({
			projectId,
			userId,
			createdAt: new Date()
		});
		await newLike.save({ session });
		
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

export async function deleteUserLike(projectId: string, userId: string) {
	const session = await mongoose.startSession();
	session.startTransaction();
	
	try {
		// Delete the Like object
		const likeResult = await LikeModel.deleteOne({ projectId, userId }, { session });
		
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

export async function deleteProjectLikes(projectId: string, session?: ClientSession) {
	try {
		const query = LikeModel.deleteMany({ projectId });
		if (session) {
			query.session(session);
		}
		const result = await query;
		return result.deletedCount;
	} catch (error) {
		console.error('Error deleting project likes:', error);
		throw error;
	}
}


export async function getTrackComments(projectId: string, session?: ClientSession) {
	try {
		const query = CommentModel.find({
			projectId,
		})
		.sort({ createdAt: -1 }); // Most recent first
		
		if (session) {
			query.session(session);
		}
		const comments = await query.exec();

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

		await UserModel.updateOne(
			{ userId },
			{ $push: { comments: newComment.commentId } },
			{ session }
		);
		
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

export async function deleteUserComment(commentId: string, session?: ClientSession) {
	const query = CommentModel.deleteOne({ commentId: commentId });
	if (session) {
		query.session(session);
	}
	const res = await query;
	return res;
}

export async function deleteProjectComments(projectId: string, session?: ClientSession) {
	try {
		const query = CommentModel.deleteMany({ projectId });
		if (session) {
			query.session(session);
		}
		const result = await query;
		return result.deletedCount;
	} catch (error) {
		console.error('Error deleting project comments:', error);
		throw error;
	}
}

export async function findRecentUserComments(projectId: string, userId: string, timeWindowMs: number, session?: ClientSession) {
	try {
		const cutoffTime = new Date(Date.now() - timeWindowMs);
		
		const query = CommentModel.find({
			projectId,
			userId,
			createdAt: { $gte: cutoffTime }
		})
		.sort({ createdAt: -1 }); // Most recent first

		if (session) {
			query.session(session);
		}
		const comments = await query.exec();
		
		return comments;
	} catch (error) {
		console.error('Error finding recent user comments:', error);
		throw error;
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
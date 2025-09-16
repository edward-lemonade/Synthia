import { AudioFileData, Comment, InteractionState, ProjectReleased } from "@shared/types";
import * as db from "@src/db/mongo_client";
import * as s3 from "@src/db/s3_client";
import { ProjectFrontModel } from "@src/models";
import { ProjectFrontTransformer, ProjectMetadataTransformer } from "@src/transformers/project.transformer";
import { Request, Response } from "express";

// Getters

export async function data(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth.sub;

	try { 
		const metadataDoc = await db.findMetadataByProjectId(projectId);
		const metadata = ProjectMetadataTransformer.fromDoc(metadataDoc!);

		const frontDoc = await db.findFrontByProjectId(projectId);
		const front = ProjectFrontTransformer.fromDoc(frontDoc!);

		const commentDocs = await db.getTrackComments(projectId);
		const comments = commentDocs.map(el => el.toObject());
		const commentsWithPfps = await populateCommentPfps(comments);

		const hasLiked = await db.hasLikedTrack(projectId, userId);
		const interactionState = {
			hasLiked: hasLiked ? true : false
		} as InteractionState;

		res.json({ 
			success: true, 

			metadata: metadata,
			front: front,
			comments: commentsWithPfps,
			interactionState: interactionState
		});
	} catch (error) {
		console.error('Error fetching track data:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Error fetching track data' 
		});
	}
}

export async function audio(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth.sub;

	try {
		const audioFileData: AudioFileData = await s3.getExportFile(projectId);
		res.json({ success: true, audioFileData: audioFileData });
	} catch (error) {
		console.error('Error getting track audio:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to get track audio' 
		});
	}
}

// User interactions

export async function leaveComment(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth.sub;
	const { comment, timestamp } = req.body;

	try {
		if (!projectId || !userId || !comment || !timestamp) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing required fields' 
			});
		}

		const sanitizedComment = sanitizeComment(comment);
		
		if (!sanitizedComment || sanitizedComment.length < 1) {
			return res.status(400).json({ 
				success: false, 
				error: 'Comment is too short' 
			});
		}

		if (sanitizedComment.length > 500) {
			return res.status(400).json({ 
				success: false, 
				error: 'Comment is too long (max 500 characters)' 
			});
		}

		// Create the comment
		const commentObj = (await db.createUserComment(projectId, userId, sanitizedComment, timestamp)).toObject();

		res.json({ 
			success: true,
			newComment: commentObj,
			message: 'Comment posted successfully'
		});
		
	} catch (error) {
		console.error('Error leaving comment:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to post comment' 
		});
	}
}

export async function toggleLike(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth.sub;

	try {
		if (!projectId || !userId) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing projectId or userId' 
			});
		}

		const existingLike = await db.hasLikedTrack(projectId, userId);
		
		if (existingLike) {
			await db.deleteUserLike(projectId, userId);
			
			res.json({ 
				success: true, 
				isLiked: false,
			});
		} else {
			await db.createUserLike(projectId, userId);
			
			res.json({ 
				success: true, 
				isLiked: true,
			});
		}
		
	} catch (error) {
		console.error('Error toggling like:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to toggle like' 
		});
	}
}

export async function recordPlay(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth.sub;
	const { timestamp } = req.body;

	try {
		if (!projectId || !userId || !timestamp) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing required fields' 
			});
		}

		const now = Date.now();
		const timeDiff = Math.abs(now - timestamp);
		
		if (timeDiff > 300000) { // 5 minutes tolerance
			return res.status(400).json({ 
				success: false, 
				error: 'Invalid timestamp' 
			});
		}

		await db.doUserPlay(projectId, userId, timestamp);

		res.json({ 
			success: true,
			message: 'Play recorded successfully'
		});
		
	} catch (error) {
		console.error('Error recording play:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to record play' 
		});
	}
}

// =============================================================================================
// Batch queries

export async function newest(req: Request, res: Response) {
    try {
        const userId = req.auth.sub; // in case you need it later for filtering
        const { amount, lastReleaseDate, lastProjectId } = req.body;

        let query: any = {};
        if (lastReleaseDate && lastProjectId) {
            query = {
                $or: [
                    { releaseDate: { $lt: lastReleaseDate } },
                    { releaseDate: lastReleaseDate, projectId: { $lt: lastProjectId } }
                ]
            };
        }

		const boundedAmount = Math.max(40, amount);
        const projectFrontDocs = await ProjectFrontModel.find(query)
            .sort({ releaseDate: -1, projectId: -1 }) // newest first
            .limit(boundedAmount);

		const projects = await Promise.all(
			projectFrontDocs.map(async (frontDoc) => {
				const metadataDoc = await db.findMetadataById(frontDoc.projectMetadataId);
				return {
					front: ProjectFrontTransformer.fromDoc(frontDoc),
					metadata: ProjectMetadataTransformer.fromDoc(metadataDoc!),
				} as ProjectReleased;
			})
		);
			
		const reachedEnd = projects.length < boundedAmount;
        res.json({
            success: true,
            projects: projects,
			reachedEnd: reachedEnd,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch projects"
        });
    }
}



// =============================================================================================
// Helpers


function sanitizeComment(comment: string): string {
	return comment
		.trim()
		.replace(/\s+/g, ' ') // Replace multiple whitespace with single space
		.replace(/<[^>]*>/g, '') // Remove HTML tags
		.substring(0, 500); // Ensure max length
}

async function populateCommentPfps(comments: Comment[]) {
	const uniqueUserIds = [...new Set(comments.map(comment => comment.userId))];
	const profilePictureChecks = await Promise.allSettled(
		uniqueUserIds.map(async (userId) => {
			const profilePictureURL = await s3.getProfilePictureUrl(userId);
			return { userId, profilePictureURL };
		})
	);
	const profilePictureMap = new Map<string, string | null>();
	profilePictureChecks.forEach((result) => {
		if (result.status === 'fulfilled') {
			profilePictureMap.set(result.value.userId, result.value.profilePictureURL);
		}
	});
	const commentsWithPfps = comments.map(comment => ({
		...comment,
		profilePictureURL: profilePictureMap.get(comment.userId) || null
	}));
	return commentsWithPfps;
}
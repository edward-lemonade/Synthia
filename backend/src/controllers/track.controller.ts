import { AudioFileData, Comment, InteractionState, ProjectReleased, User, RelevantProjectOrUser, WaveformData } from "@shared/types";
import * as db from "@src/db/mongo_client";
import * as s3 from "@src/db/s3_client";
import { ProjectFrontModel } from "@src/models";
import { UserModel } from "@src/models/User.model";
import { ProjectFrontTransformer, ProjectMetadataTransformer } from "@src/transformers/project.transformer";
import { assertProjectAccess } from "@src/utils/authorization";
import { Request, Response } from "express";
import { Base64 } from "js-base64";

// Getters

export async function data(req: Request, res: Response) {
	const { projectId } = req.params;
    const userId = req.auth?.sub ?? null;

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
			interactionState: interactionState,
		});
	} catch (error) {
		console.error('Error fetching track data:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Error fetching track data' 
		});
	}
}

export async function waveform(req: Request, res: Response) {
	const { projectId } = req.params;

	try {
		const waveformData = await s3.getWaveformData(projectId);
		if (!waveformData) {
			res.json({ success: false, waveformData: null });
		}
		res.json({ success: true, waveformData: waveformData });
	} catch (error) {
		console.error('Error getting track audio:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Failed to get track audio' 
		});
	}
}

export async function audio(req: Request, res: Response) {
	const { projectId } = req.params;

	try {
		const audioFileData: AudioFileData|null = await s3.getExportFile(projectId);
		if (!audioFileData) {throw new Error("File not found in S3");}

		const audioFileDataWithWaveform: AudioFileData = {
			...audioFileData,
			waveformData: await s3.getWaveformData(projectId),
		}
		res.json({ success: true, audioFileData: audioFileDataWithWaveform });
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
			});
		}

		const sanitizedComment = sanitizeComment(comment);
		
		if (!sanitizedComment || sanitizedComment.length < 1) {
			return res.status(400).json({ 
				success: false, 
			});
		}

		if (sanitizedComment.length > 500) {
			return res.status(400).json({ 
				success: false, 
			});
		}


		const commentObj = (await db.createUserComment(projectId, userId, sanitizedComment, timestamp)).toObject();
		res.json({ 
			success: true,
			newComment: commentObj,
		});
		
	} catch (error) {
		console.error('Error leaving comment:', error);
		res.status(500).json({ 
			success: false, 
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
			return res.status(400).json({ success: false });
		}

		const now = Date.now();
		const timeDiff = Math.abs(now - timestamp);
		
		if (timeDiff > 300000) { // 5 minutes tolerance
			return res.status(400).json({ 
				success: false, 
			});
		}

		await db.doUserPlay(projectId, userId, timestamp);

		res.json({ success: true });
		
	} catch (error) {
		console.error('Error recording play:', error);
		res.status(500).json({ success: false });
	}
}

export async function stream(req: Request, res: Response) {
	const { projectId } = req.params;
	const range = req.headers.range; // "bytes=0-1000"

	try {
		if (!projectId) {
			return res.status(400).json({ 
				success: false, 
				error: 'Missing required fields' 
			});
		}

		const fileSize = await s3.getExportSize(projectId);
		const MAX_CHUNK_SIZE = 4 * 1024 * 1024;

		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const startByte = parseInt(parts[0], 10);

			let endByte = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			endByte = Math.min(endByte, fileSize - 1, startByte + MAX_CHUNK_SIZE - 1);

			if (startByte >= fileSize || endByte >= fileSize || startByte > endByte) {
				return res.status(416).json({
					success: false,
					error: 'Bad range'
				});
			}

			const chunkSize = (endByte - startByte) + 1;
			const stream = await s3.streamExportRange(projectId, startByte, endByte);
			console.log(`Streaming bytes ${startByte}-${endByte} of ${fileSize} for project ${projectId}: Chunk size ${chunkSize}`);
			res.writeHead(206, {
				'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunkSize,
				'Content-Type': 'audio/wav',
			});
			stream.pipe(res);
		} else {
			const stream = await s3.streamExportRange(projectId);
			res.writeHead(200, {
				'Content-Length': fileSize,
				'Content-Type': 'audio/wav',
				'Accept-Ranges': 'bytes',
			});
			stream.pipe(res);
		}
	} catch (error) {
		console.error('Error getting audio stream:', error);
		res.status(500).json({ 
			success: false, 
			error: 'Error getting audio stream' 
		});
	}
}
export async function download(req: Request, res: Response) {
	const { projectId } = req.params;
	try {
		if (!projectId) {
			return res.status(400).json({ success: false, error: 'Missing projectId' });
		}

		const fileSize = await s3.getExportSize(projectId);
		const stream = await s3.streamExportRange(projectId);

		res.writeHead(200, {
			'Content-Length': fileSize,
			'Content-Type': 'audio/wav',
			'Content-Disposition': `attachment; filename="project-${projectId}.wav"`,
		});

		stream.pipe(res);
	} catch (error) {
		console.error('Download error:', error);
		res.status(500).json({ success: false, error: 'Error downloading audio file' });
	}
}

// =============================================================================================
// Batch queries

const MAX_AMOUNT = 40;

export async function newest(req: Request, res: Response) {
    try {
        const { amount, lastReleaseDate, lastProjectId } = req.body;

        let query: any = {};
        if (lastReleaseDate && lastProjectId) {
            query = {
                $or: [
                    { dateReleased: { $lt: lastReleaseDate } },
                    { dateReleased: lastReleaseDate, projectId: { $lt: lastProjectId } }
                ]
            };
        }

		const boundedAmount = Math.min(MAX_AMOUNT, amount);
        const projectFrontDocs = await ProjectFrontModel.find(query)
            .sort({ dateReleased: -1 }) // newest first
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

export async function hottest(req: Request, res: Response) {
    try {
        const { amount, lastHotness, lastProjectId } = req.body;

		// Use "aggregation pipeline" since hotness isn't actually stored

        let pipeline: any[] = [{
			$addFields: {
				hotness: { 
					$add: [
						{ $multiply: ["$plays", 1] },      // Weight plays by 1
						{ $multiply: ["$likes", 3] }       // Weight likes by 3 (more valuable)
					]
				}
			}
        }];

        if (lastHotness !== undefined && lastProjectId) {
            pipeline.push({
                $match: {
                    $or: [
                        { hotness: { $lt: lastHotness } },
                        { hotness: lastHotness, projectId: { $lt: lastProjectId } }
                    ]
                }
            });
        }

		const boundedAmount = Math.min(MAX_AMOUNT, amount);
        pipeline.push(
            { $sort: { hotness: -1, projectId: -1 } },
            { $limit: boundedAmount }
        );

        const projectFrontDocs = await ProjectFrontModel.aggregate(pipeline);
		const lastElement = projectFrontDocs[projectFrontDocs.length - 1];
    	const newLastHotness = lastElement.hotness;

        const projects = await Promise.all(
            projectFrontDocs.map(async (frontDoc) => {
                const metadataDoc = await db.findMetadataById(frontDoc.projectMetadataId);
                return {
                    front: frontDoc,
                    metadata: ProjectMetadataTransformer.fromDoc(metadataDoc!),
                } as ProjectReleased;
            })
        );

        const reachedEnd = projects.length < boundedAmount;
		
		res.json({
            success: true,
            projects: projects,
			lastHotness: newLastHotness,
            reachedEnd: reachedEnd,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Failed to fetch projects by hotness"
        });
    }
}

export async function search(req: Request, res: Response) {
    try {
        const { amount, lastScore, lastProjectId, lastUserId, searchTerm } = req.body;

        if (!searchTerm || searchTerm.trim().length === 0) {
            return res.json({ success: true, results: [], reachedEnd: true });
        }

        const boundedAmount = Math.min(MAX_AMOUNT, amount);

        const projectFrontDocs = await searchRelevantTracks(boundedAmount, searchTerm, lastScore, lastProjectId);
        const userDocs = await searchRelevantUsers(boundedAmount, searchTerm, lastScore, lastUserId);

        // Process tracks
        const projects = await Promise.all(
            projectFrontDocs.map(async (frontDoc) => {
                const metadataDoc = await db.findMetadataById(frontDoc.projectMetadataId);
                return {
                    _itemType: 'track',
                    _searchScore: frontDoc.searchScore,
                    _id: frontDoc.projectId,
					front: frontDoc,
                    metadata: ProjectMetadataTransformer.fromDoc(metadataDoc!),
                } as RelevantProjectOrUser;
            })
        );

        // Process users
        const users = await Promise.all(
			userDocs.map(async (userDoc) => {
				const pfp = await s3.getProfilePictureUrl(userDoc.auth0Id);
				return {
					_itemType: 'user',
					_searchScore: userDoc.searchScore,
					_id: userDoc.userId,
					user: {...userDoc, profilePictureURL: pfp}, // technically they are already objs
				} as RelevantProjectOrUser;
			})
		);

        // Combine and sort all results by searchScore
        const allResults = [...projects, ...users].sort((a, b) => {
            if (b._searchScore !== a._searchScore) {
                return b._searchScore! - a._searchScore!; // Higher score first
            }
            return a._id!.localeCompare(b._id!); // Secondary sort by ID for consistency
        });

        // Pagination
        let paginatedResults = allResults;
        if (lastScore !== undefined && (lastProjectId || lastUserId)) {
            paginatedResults = allResults.filter(result => {
                if (result._searchScore! < lastScore) return true;
                if (result._searchScore === lastScore) {
                    if (result._itemType === 'track' && lastProjectId) {
                        return result._id! < lastProjectId;
                    }
                    if (result._itemType === 'user' && lastUserId) {
                        return result._id! < lastUserId;
                    }
                }
                return false;
            });
        }

        const limitedResults = paginatedResults.slice(0, boundedAmount);

        const lastResult = limitedResults[limitedResults.length - 1];
        const newLastScore = lastResult?._searchScore;
        const newLastProjectId = lastResult?._itemType === 'track' ? lastResult._id : undefined;
        const newLastUserId = lastResult?._itemType === 'user' ? lastResult._id : undefined;

        const reachedEnd = limitedResults.length < boundedAmount;
        res.json({
            success: true,
            results: limitedResults,
            lastScore: newLastScore,
            lastProjectId: newLastProjectId,
            lastUserId: newLastUserId,
            reachedEnd: reachedEnd,
        });
    } catch (err) {
        console.error(err);
        res.json({
            success: false,
        });
    }
}

async function searchRelevantTracks(boundedAmount: number, searchTerm: string, lastScore?: number, lastProjectId?: string) {
	let pipeline: any[] = [
		{
			$search: {
				index: "relevantTracks",
				text: {
					query: searchTerm,
					path: ["description", "title"] // Search both fields
				}
			}
		},
		{
			$addFields: {
				searchScore: { $meta: "searchScore" }
			}
		}
	];

	if (lastScore !== undefined && lastProjectId) {
		pipeline.push({
			$match: {
				$or: [
					{ searchScore: { $lt: lastScore } },
					{ searchScore: lastScore, projectId: { $lt: lastProjectId } }
				]
			}
		});
	}

	pipeline.push(
		{ $sort: { searchScore: -1, projectId: -1 } }, // Best matches first
		{ $limit: boundedAmount }
	);

	const projectFrontDocs = await ProjectFrontModel.aggregate(pipeline);
	return projectFrontDocs;
}

async function searchRelevantUsers(boundedAmount: number, searchTerm: string, lastScore?: number, lastUserId?: string) {
    let pipeline: any[] = [
        {
            $search: {
                index: "relevantUsers", // Your Atlas search index for users
                text: {
                    query: searchTerm,
                    path: ["displayName"]
                }
            }
        },
        {
            $addFields: {
                searchScore: { $meta: "searchScore" }
            }
        }
    ];

    if (lastScore !== undefined && lastUserId) {
        pipeline.push({
            $match: {
                $or: [
                    { searchScore: { $lt: lastScore } },
                    { searchScore: lastScore, userId: { $lt: lastUserId } }
                ]
            }
        });
    }

    pipeline.push(
        { $sort: { searchScore: -1, userId: -1 } },
        { $limit: boundedAmount }
    );

    const userDocs = await UserModel.aggregate(pipeline); 
    return userDocs;
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
import { Request, Response } from 'express';
import { User } from '@shared/types';
import { UserModel } from '@src/models/User.model';

import * as db from "@src/db/mongo_client";
import * as s3 from "@src/db/s3_client";
import { processProfilePicture } from '@src/utils/image-processor';
import { ProjectFrontTransformer, ProjectMetadataTransformer } from '@src/transformers/project.transformer';

export async function getUser(req: Request, res: Response) {
	try {
		const sub = req.auth.sub;
		if (!sub) {
			return res.status(401).json({ error: 'No sub claim in token' });
		}

		const userDoc = await UserModel.findOne({ auth0Id: sub });
		
		if (!userDoc) {
			return res.json({ user: null, isNew: true });
		}
		
		const user = userDoc.toObject();
		user.profilePictureURL = await s3.getProfilePictureUrl(sub);

		return res.json({ user: user, isNew: false });
	} catch (err) {
		console.error('Error in getUser:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

export async function createUser(req: Request, res: Response) {
	try {
		const sub = req.auth.sub;
		if (!sub) {
			return res.status(401).json({ error: 'No sub claim in token' });
		}

		let userDoc = await UserModel.findOne({ auth0Id: sub });
		let isNew = false;

		if (!userDoc) {
			const email = req.auth.email ?? "sample_email@gmail.com";
			const displayName = req.body.displayName;
			const bio = req.body.bio;

			userDoc = await UserModel.create({
				auth0Id: sub,
				email: email,
				displayName: displayName,
				bio: bio,
			});
			isNew = true;
		}
		
		const user = userDoc.toObject();
		user.profilePictureURL = await s3.getProfilePictureUrl(sub);

		return res.json({user: user, isNew: isNew});
	} catch (err) {
		console.error('Error in getOrCreateUser:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

export async function updateUserProfile(req: Request, res: Response) {
	try {
		const sub = req.auth.sub;
		if (!sub) {
			return res.status(401).json({ error: 'No sub claim in token' });
		}

		const { displayName, bio } = req.body;

		if (displayName && (displayName.length < 1 || displayName.length > 30)) {
			return res.status(400).json({ error: 'Display name must be between 1 and 30 characters' });
		}
		if (displayName && !/^[a-zA-Z0-9_]+$/.test(displayName)) {
			return res.status(400).json({ error: 'Display name can only contain letters, numbers, and underscores' });
		}
		if (bio && bio.length > 200) {
			return res.status(400).json({ error: 'Bio must be 200 characters or less' });
		}

		if (displayName) {
			const existingUser = await UserModel.findOne({ 
				displayName: displayName, 
				auth0Id: { $ne: sub } 
			});
			if (existingUser) {
				return res.status(400).json({ error: 'Display name is already taken' });
			}
		}

		const updateData: any = {};
		if (displayName !== undefined) updateData.displayName = displayName;
		if (bio !== undefined) updateData.bio = bio;

		const user = await UserModel.findOneAndUpdate(
			{ auth0Id: sub },
			updateData,
			{ new: true, runValidators: true }
		);

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		return res.json({ user });
	} catch (err) {
		console.error('Error in updateUserProfile:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

export async function updateProfilePicture(req: Request, res: Response) {
	try {
		const sub = req.auth.sub;
		if (!sub) {
			return res.status(401).json({ error: 'No sub claim in token' });
		}

		// Check if file was uploaded
		if (!req.file) {return res.status(400).json({ error: 'No file uploaded' });}
		// Validate file type
		if (!req.file.mimetype.startsWith('image/')) {return res.status(400).json({ error: 'File must be an image' });}
		// Validate file size (max 5MB)
		if (req.file.size > 5 * 1024 * 1024) {return res.status(400).json({ error: 'File size must be less than 5MB' });}

		// Process the image (crop to square and resize)
		const processedImage = await processProfilePicture(req.file.buffer, req.file.mimetype);
		const processedFile: Express.Multer.File = {
			...req.file,
			buffer: processedImage.buffer,
			mimetype: processedImage.contentType,
			size: processedImage.buffer.length
		};

		await s3.putProfilePicture(sub, processedFile);
		const url = await s3.getProfilePictureUrl(sub);
		
		return res.json({ success: true, profilePictureURL: url });
	} catch (err) {
		console.error('Error in updateProfilePicture:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

export async function getProfile(req: Request, res: Response) {
	try {
		const { displayName } = req.params;

		let userDoc = await UserModel.findOne({ displayName });
		if (!userDoc) {
			return res.status(404).json({ error: 'User not found' });
		}

		const targetUserId = userDoc.auth0Id;
		const user = userDoc.toObject();
		user.profilePictureURL = await s3.getProfilePictureUrl(targetUserId);

		const metadataDocs = await db.findMetadatasByUser(targetUserId);
		const releasedDocs = metadataDocs.filter(doc => doc.isReleased);

		const projects = await Promise.all(releasedDocs.map(async (metadataDoc) => {
			const metadata = ProjectMetadataTransformer.fromDoc(metadataDoc);
			const frontDoc = await db.findFrontByProjectId(metadata.projectId);
			
			const released = ProjectFrontTransformer.toReleased(metadataDoc, frontDoc!);
			return released;
		}));

		return res.json({ user, projects });
	} catch (err) {
		console.error('Error in getProfile:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

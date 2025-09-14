import { Request, Response } from 'express';
import { User } from '@shared/types';
import { UserModel } from '@src/models/User.model';

export async function getOrCreateUser(req: Request, res: Response) {
	try {
		const sub = req.auth.sub;
		if (!sub) {
			return res.status(401).json({ error: 'No sub claim in token' });
		}

		let user = await UserModel.findOne({ auth0Id: sub });
		let isNew = false;

		if (!user) {
			const email = req.auth.email ?? "sample_email@gmail.com";
			const name = req.auth.name ?? "SampleDisplayName";

			user = await UserModel.create({
				auth0Id: sub,
				email: email,
				displayName: name,
				picture: req.auth.picture
			});
			isNew = true;
		}

		return res.json({user: user, isNew: isNew});
	} catch (err) {
		console.error('Error in getOrCreateUser:', err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
}

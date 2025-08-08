import { StudioSession } from "@models/StudioSession";

export async function newStudioSessionDb(userId: string, sessionId: string) {
	console.log(userId, sessionId);
	const studioSession = new StudioSession({userId, sessionId});

	try {
		studioSession.save();
	} catch (error) {
		console.log("Error occurred while saving studio session to database: ", error)
	}
}
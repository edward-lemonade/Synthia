import { StudioSession } from "@models/StudioSession";

export async function newStudioSession(userId: string, sessionId: string) {
	const studioSession = new StudioSession({
		userId, sessionId
	});
	try {
		studioSession.save();
	} catch (error) {
		console.log("Error occurred while saving studio session to database: ", error)
	}
	
}
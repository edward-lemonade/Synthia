export interface User {
	auth0Id: string;
	displayName: string;
	bio: string;
	profilePictureURL?: string | null; // URL to profile picture
	
	// Social features
	comments: 	string[]; // objectIds 
	likes: 		string[]; // projectIds
	followers: 	string[]; // userIds
	following: 	string[]; // userIds
	
	// Timestamps
	createdAt: Date;
	lastLoginAt?: Date;
}
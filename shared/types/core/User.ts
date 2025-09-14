export interface User {
	auth0Id: string;
	displayName: string;
	bio: string;
	
	// Social features
	comments: 	string[]; // objectIds 
	likes: 		string[]; // projectIds
	followers: 	string[]; // userIds
	following: 	string[]; // userIds
	
	// Timestamps
	createdAt: Date;
	lastLoginAt?: Date;
}
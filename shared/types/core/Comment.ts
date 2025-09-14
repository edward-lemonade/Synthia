export interface Comment {
	commentId: string;
	projectId: string;
	userId: string;
	displayName: string;
	content: string;

	createdAt: Date;
	updatedAt: Date;
}

// since Dates turn into strings over http API requests...
export interface CommentDTO extends Omit<Comment, 'createdAt' | 'updatedAt'> {
	createdAt: string;
	updatedAt: string;
}
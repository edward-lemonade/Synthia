export interface Comment {
	commentId: string;
	projectId: string;
	userId: string;
	displayName: string;
	content: string;
	profilePictureURL?: string | null;

	createdAt: Date;
	updatedAt: Date;
}

// since Dates turn into strings over http API requests...
export interface CommentDTO extends Omit<Comment, 'createdAt' | 'updatedAt'> {
	createdAt: string;
	updatedAt: string;
}

export function fillDates(comment: CommentDTO): Comment {
	return {
		...comment,
		createdAt: new Date(comment.createdAt),
		updatedAt: new Date(comment.updatedAt),
	}
}
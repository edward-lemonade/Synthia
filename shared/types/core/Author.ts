export interface Author {
	userId: string;
	username: string;
} 

export function isAuthor(obj: any): obj is Author {
	return obj && typeof obj.userId === 'string' && typeof obj.username === 'string';
}
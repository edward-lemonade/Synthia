export interface Author {
	userId: string;
	displayName: string;
} 

export function isAuthor(obj: any): obj is Author {
	return obj && typeof obj.userId === 'string' && typeof obj.displayName === 'string';
}
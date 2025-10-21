import { ProjectMetadata, ProjectFront, ProjectReleased, Author, User, Comment, WaveformData } from '@shared/types';

export function createMockAuthor(overrides: Partial<Author> = {}): Author {
	return {
		userId: 'user-1',
		displayName: 'Test User',
		...overrides
	};
}

export function createMockUser(overrides: Partial<User> = {}): User {
	return {
		auth0Id: 'auth0-123',
		displayName: 'Test User',
		profilePictureURL: 'avatar.jpg',
		bio: 'Test bio',
		comments: [],
		likes: [],
		followers: [],
		following: [],
		createdAt: new Date('2023-01-01T00:00:00Z'),
		lastLoginAt: new Date('2023-01-01T00:00:00Z'),
		...overrides
	};
}

export function createMockProjectMetadata(overrides: Partial<ProjectMetadata> = {}): ProjectMetadata {
	return {
		projectId: 'project-1',
		createdAt: new Date('2023-01-01T00:00:00Z'),
		updatedAt: new Date('2023-01-01T00:00:00Z'),
		title: 'Test Project',
		authors: [createMockAuthor()],
		isCollaboration: false,
		isRemix: false,
		isRemixOf: null,
		isReleased: false,
		...overrides
	};
}

export function createMockProjectFront(overrides: Partial<ProjectFront> = {}): ProjectFront {
	return {
		projectId: 'project-1',
		title: 'Test Project',
		release: 'Single',
		description: 'Test description',
		access: 'public',
		dateReleased: new Date('2023-01-01T00:00:00Z'),
		plays: 100,
		likes: 50,
		remixes: 5,
		saves: 25,
		playlists: [],
		commentIds: [],
		...overrides
	};
}

export function createMockProjectReleased(overrides: Partial<ProjectReleased> = {}): ProjectReleased {
	return {
		metadata: createMockProjectMetadata(overrides.metadata),
		front: createMockProjectFront(overrides.front),
		...overrides
	};
}

export function createMockComment(overrides: Partial<Comment> = {}): Comment {
	return {
		commentId: 'comment-1',
		projectId: 'project-1',
		userId: 'user-1',
		displayName: 'Test User',
		content: 'Test comment',
		profilePictureURL: 'avatar.jpg',
		createdAt: new Date('2023-01-01T00:00:00Z'),
		updatedAt: new Date('2023-01-01T00:00:00Z'),
		...overrides
	};
}

export function createMockWaveformData(overrides: Partial<WaveformData> = {}): WaveformData {
	return {
		duration: 120,
		sampleRate: 44100,
		channels: 2,
		peaks: new Float32Array([0, 1, 0, -1, 0.5, -0.5]),
		...overrides
	};
}

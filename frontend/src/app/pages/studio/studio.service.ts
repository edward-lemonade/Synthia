import { Injectable, signal } from '@angular/core';
import { Key, Keys } from '@shared/types/Key';
import { TimeSignature, DefaultTimeSignature } from '@shared/types/TimeSignature';
import { User } from '@shared_types/User';

@Injectable()
export class StudioService {

	// Project metadata

	projectId = signal<string>('');
	title = signal<string>('Untitled Project'); // toolbar-top
	authors = signal<User[]>([]);
	createdAt = signal<Date | null>(null);
	updatedAt = signal<Date | null>(null);
	
	isCollaboration = signal<boolean>(false);
	isRemix = signal<boolean>(false);
	isRemixOf = signal<string | null>(null);
	isReleased = signal<boolean>(false);
	
	// Master settings

	bpm = signal<number>(140); 
	key = signal<Key>(Keys.C); // toolbar-details/keys
	centOffset = signal<number>(0);
	timeSignature = signal<TimeSignature>(DefaultTimeSignature);
	
	masterVolume = signal<number>(100); // default master volume

	// Files and tracks
	
	files = signal<Record<string, {
		filename: string;
		mimetype: string;
		s3path?: string;
		data?: string;
	}>>({});
	
	tracks = signal<{
		id: string;
		name: string;
		type: "audio" | "midi";
		volume: number;
		pan: number;
		mute: boolean;
		solo: boolean;
		effects: {
			type: string;
			settings: Record<string, any>;
		}[];
	}[]>([]);

	// Initialize with a new project
	initializeProject(projectId?: string): void {
		const now = new Date();
		this.projectId.set(projectId ?? '');
		this.title.set('Untitled Project');
		this.authors.set([]);
		this.createdAt.set(now);
		this.updatedAt.set(now);
		this.isCollaboration.set(false);
		this.isRemix.set(false);
		this.isRemixOf.set(null);
		this.isReleased.set(false);
		this.bpm.set(140);
		this.key.set(Keys.C);
		this.centOffset.set(0);
		this.timeSignature.set(DefaultTimeSignature);
		this.masterVolume.set(100); // default master volume
		this.files.set({});
		this.tracks.set([]);
	}

	// Load existing project data
	loadProject(projectData: any): void {
		this.projectId.set(projectData._id ?? '');
		this.title.set(projectData.title ?? 'Untitled Project');
		this.authors.set(projectData.authors ?? []);
		this.createdAt.set(projectData.createdAt ? new Date(projectData.createdAt) : null);
		this.updatedAt.set(projectData.updatedAt ? new Date(projectData.updatedAt) : null);
		this.isCollaboration.set(projectData.isCollaboration ?? false);
		this.isRemix.set(projectData.isRemix ?? false);
		this.isRemixOf.set(projectData.isRemixOf ?? null);
		this.isReleased.set(projectData.isReleased ?? false);
		this.bpm.set(projectData.bpm ?? 140);
		this.key.set(projectData.key ?? null);
		this.centOffset.set(projectData.centOffset ?? 0);
		this.timeSignature.set(projectData.timeSignature ?? {N:4, D:4});
		this.masterVolume.set(projectData.masterVolume ?? 100);
		this.files.set(projectData.files ?? {});
		this.tracks.set(projectData.tracks ?? []);
	}

	addAuthor(user: User): void {
		const currentAuthorIds = this.authors().map((user: User) => user.userId);
		if (!currentAuthorIds.includes(user.userId)) {
			this.authors.set([...this.authors(), user]);
		}
	}
	removeAuthor(userId: string): void {
		const currentAuthors = this.authors();
		const newAuthors = currentAuthors.filter((author: User) => author.userId !== userId);
		this.authors.set(newAuthors);
	}
	isUserAuthor(userId: string): boolean {
		const currentAuthors = this.authors();
		return currentAuthors.some((author: User) => author.userId === userId);
	}


	addTrack(track: any): void {
		const currentTracks = this.tracks();
		this.tracks.set([...currentTracks, track]);
	}

	removeTrack(trackId: string): void {
		const currentTracks = this.tracks();
		this.tracks.set(currentTracks.filter(track => track.id !== trackId));
	}

	updateTrack(trackId: string, updates: Partial<any>): void {
		const currentTracks = this.tracks();
		const updatedTracks = currentTracks.map(track => 
			track.id === trackId ? { ...track, ...updates } : track
		);
		this.tracks.set(updatedTracks);
	}
}

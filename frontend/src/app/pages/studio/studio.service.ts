import { Injectable, signal } from '@angular/core';

@Injectable()
export class StudioService {

	// Project metadata

	projectId = signal<string>('');
	title = signal<string>('Untitled Project');
	authorIds = signal<string[]>([]);
	authors = signal<string[]>([]);
	createdAt = signal<Date | null>(null);
	updatedAt = signal<Date | null>(null);
	
	isCollaboration = signal<boolean>(false);
	isRemix = signal<boolean>(false);
	isRemixOf = signal<string | null>(null);
	isReleased = signal<boolean>(false);
	
	// Master settings

	bpm = signal<number>(140);
	key = signal<string | null>(null);
	centOffset = signal<number>(0);
	
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
		this.authorIds.set([]);
		this.authors.set([]);
		this.createdAt.set(now);
		this.updatedAt.set(now);
		this.isCollaboration.set(false);
		this.isRemix.set(false);
		this.isRemixOf.set(null);
		this.isReleased.set(false);
		this.bpm.set(140);
		this.key.set(null);
		this.centOffset.set(0);
		this.masterVolume.set(100); // default master volume
		this.files.set({});
		this.tracks.set([]);
	}

	// Load existing project data
	loadProject(projectData: any): void {
		this.projectId.set(projectData._id ?? '');
		this.title.set(projectData.title ?? 'Untitled Project');
		this.authorIds.set(projectData.authorIds ?? []);
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
		this.files.set(projectData.files ?? {});
		this.tracks.set(projectData.tracks ?? []);
	}

	// Update timestamp when any property changes
	private updateTimestamp(): void {
		this.updatedAt.set(new Date());
	}

	// Convenience methods for common updates
	updateTitle(newTitle: string): void {
		this.title.set(newTitle);
		this.updateTimestamp();
	}

	updateBpm(newBpm: number): void {
		this.bpm.set(newBpm);
		this.updateTimestamp();
	}

	updateKey(newKey: string | null): void {
		this.key.set(newKey);
		this.updateTimestamp();
	}

	addTrack(track: any): void {
		const currentTracks = this.tracks();
		this.tracks.set([...currentTracks, track]);
		this.updateTimestamp();
	}

	removeTrack(trackId: string): void {
		const currentTracks = this.tracks();
		this.tracks.set(currentTracks.filter(track => track.id !== trackId));
		this.updateTimestamp();
	}

	updateTrack(trackId: string, updates: Partial<any>): void {
		const currentTracks = this.tracks();
		const updatedTracks = currentTracks.map(track => 
			track.id === trackId ? { ...track, ...updates } : track
		);
		this.tracks.set(updatedTracks);
		this.updateTimestamp();
	}
}

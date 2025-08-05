import { Injectable, signal, computed } from '@angular/core';
import { ProjectMetadata } from '@shared/types/ProjectMetadata';


@Injectable({ providedIn: 'root' })
export class ProjectMetadataService {
	readonly _id = signal('placeholder');
	readonly title = signal('Untitled');
	readonly authorIds = signal<string[]>([]);
	readonly authors = signal<string[]>([]);
	readonly createdAt = signal(new Date());
	readonly updatedAt = signal(new Date());
	readonly isCollaboration = signal(false);
	readonly isRemix = signal(false);
	readonly isRemixOf = signal<string | null>(null);
	readonly isReleased = signal(false);

	readonly state = computed<ProjectMetadata>(() => ({
		_id: this._id(),
		title: this.title(),
		authorIds: this.authorIds(),
		authors: this.authors(),
		createdAt: this.createdAt(),
		updatedAt: this.updatedAt(),
		isCollaboration: this.isCollaboration(),
		isRemix: this.isRemix(),
		isRemixOf: this.isRemixOf(),
		isReleased: this.isReleased()
	}));

	init(metadata: ProjectMetadata) {
		this._id.set(metadata._id);
		this.title.set(metadata.title);
		this.authorIds.set(metadata.authorIds);
		this.authors.set(metadata.authors);
		this.createdAt.set(new Date(metadata.createdAt));
		this.updatedAt.set(new Date(metadata.updatedAt));
		this.isCollaboration.set(metadata.isCollaboration);
		this.isRemix.set(metadata.isRemix);
		this.isRemixOf.set(metadata.isRemixOf);
		this.isReleased.set(metadata.isReleased);
	}

	update(partial: Partial<ProjectMetadata>) {
		if (partial._id !== undefined) this._id.set(partial._id);
		if (partial.title !== undefined) this.title.set(partial.title);
		if (partial.authorIds !== undefined) this.authorIds.set(partial.authorIds);
		if (partial.authors !== undefined) this.authors.set(partial.authors);
		if (partial.createdAt !== undefined) this.createdAt.set(new Date(partial.createdAt));
		if (partial.updatedAt !== undefined) this.updatedAt.set(new Date(partial.updatedAt));
		if (partial.isCollaboration !== undefined) this.isCollaboration.set(partial.isCollaboration);
		if (partial.isRemix !== undefined) this.isRemix.set(partial.isRemix);
		if (partial.isRemixOf !== undefined) this.isRemixOf.set(partial.isRemixOf);
		if (partial.isReleased !== undefined) this.isReleased.set(partial.isReleased);
	}
}
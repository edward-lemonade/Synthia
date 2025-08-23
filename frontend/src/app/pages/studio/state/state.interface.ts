import { Author, DefaultKey, DefaultTimeSignature, ProjectMetadata, ProjectStudio } from "@shared/types";

export interface ProjectState {
	metadata: ProjectMetadata | null;
	studio: ProjectStudio | null;
	loading: boolean;
	saving: boolean;
	error: any;
	lastSaved: Date | null;
	hasUnsavedChanges: boolean;
}

export const DEFAULT_STATE : ProjectState = {
	metadata: {
		projectId: '',
		title: 'Untitled',
		authors: [] as Author[],
		createdAt: new Date(),
		updatedAt: new Date(),
		isCollaboration: false,
		isRemix: false,
		isRemixOf: null,
		isReleased: false,
	} as ProjectMetadata,
	studio: {
		bpm: 120,
		key: DefaultKey,
		centOffset: 0,
		timeSignature: DefaultTimeSignature,
		masterVolume: 100,

		tracks: {} 
	} as ProjectStudio,

	loading: false,
	saving: false,
	error: null,
	lastSaved: null,
	hasUnsavedChanges: false,
}
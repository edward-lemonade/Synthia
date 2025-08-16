import { Author, ProjectMetadata, ProjectStudio } from "@shared/types";
import { DefaultKey, DefaultTimeSignature, Globals, Track, Tracks } from "@shared/types/studio";

export const DEFAULT_STATE = {
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
	globals: {
		bpm: 120,
		key: DefaultKey,
		centOffset: 0,
		timeSignature: DefaultTimeSignature,
		masterVolume: 100,
	} as Globals,
	tracks: {
		arr: [] as Track[],
	} as Tracks
} as ProjectStudio
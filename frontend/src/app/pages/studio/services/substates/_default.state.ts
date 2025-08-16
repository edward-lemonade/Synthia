import { Author, ProjectMetadata, ProjectStudio } from "@shared/types";
import { DefaultKey, DefaultTimeSignature, ProjectStudioGlobals, Track, ProjectStudioTracks } from "@shared/types";

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
	} as ProjectStudioGlobals,
	tracks: {
		arr: [] as Track[],
	} as ProjectStudioTracks
} as ProjectStudio
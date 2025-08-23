import { createAction, props } from '@ngrx/store';
import { AudioRegion, Author, BaseFile, Key, MidiRegion, ProjectMetadata, ProjectStudio, TimeSignature, Track } from '@shared/types';

// =====================================================================================
// Project
// =====================================================================================

export const loadProject = createAction(
	'[Project] Load Project',
	props<{ projectId: string }>()
);

export const loadProjectSuccess = createAction(
	'[Project] Load Project Success',
	props<{ metadata: ProjectMetadata; studio: ProjectStudio }>()
);

export const loadProjectFailure = createAction(
	'[Project] Load Project Failure',
	props<{ error: any }>()
);

export const saveProject = createAction(
	'[Project] Save Project'
);

export const saveProjectSuccess = createAction(
	'[Project] Save Project Success',
	props<{ metadata: ProjectMetadata; studio: ProjectStudio }>()
);

export const saveProjectFailure = createAction(
	'[Project] Save Project Failure',
	props<{ error: any }>()
);

export const createNewProject = createAction(
	'[Project] Create New Project',
	props<{ title: string; authors: Author[] }>()
);

export const clearProject = createAction(
	'[Project] Clear Project'
);

// =====================================================================================
// Metadata
// =====================================================================================

export const updateProjectTitle = createAction(
	'[Project] Update Project Title',
	props<{ title: string }>()
);

export const addAuthor = createAction(
	'[Project] Add Author',
	props<{ author: Author }>()
);

export const removeAuthor = createAction(
	'[Project] Remove Author',
	props<{ authorId: string }>()
);

export const setCollaborationStatus = createAction(
	'[Project] Set Collaboration Status',
	props<{ isCollaboration: boolean }>()
);

export const setRemixStatus = createAction(
	'[Project] Set Remix Status',
	props<{ isRemix: boolean; isRemixOf?: string | null }>()
);

export const setReleaseStatus = createAction(
	'[Project] Set Release Status',
	props<{ isReleased: boolean }>()
);

// =====================================================================================
// Studio Globals
// =====================================================================================

export const setBpm = createAction(
	'[Project] Set BPM',
	props<{ bpm: number }>()
);

export const setKey = createAction(
	'[Project] Set Key',
	props<{ key: Key }>()
);

export const setCentOffset = createAction(
	'[Project] Set Cent Offset',
	props<{ centOffset: number }>()
);

export const setTimeSignature = createAction(
	'[Project] Set Time Signature',
	props<{ timeSignature: TimeSignature }>()
);

export const setMasterVolume = createAction(
	'[Project] Set Master Volume',
	props<{ masterVolume: number }>()
);

// =====================================================================================
// Tracks
// =====================================================================================

export const addTrack = createAction(
	'[Project] Add Track',
	props<{ track: Track }>()
);

export const updateTrack = createAction(
	'[Project] Update Track',
	props<{ trackIndex: number; updates: Partial<Track> }>()
);

export const removeTrack = createAction(
	'[Project] Remove Track',
	props<{ trackIndex: number }>()
);

export const reorderTracks = createAction(
	'[Project] Reorder Tracks',
	props<{ fromIndex: number; toIndex: number }>()
);

export const muteTrack = createAction(
	'[Project] Mute Track',
	props<{ trackIndex: number; mute: boolean }>()
);

export const soloTrack = createAction(
	'[Project] Solo Track',
	props<{ trackIndex: number; solo: boolean }>()
);

export const setTrackVolume = createAction(
	'[Project] Set Track Volume',
	props<{ trackIndex: number; volume: number }>()
);

export const setTrackPan = createAction(
	'[Project] Set Track Pan',
	props<{ trackIndex: number; pan: number }>()
);

export const setTrackName = createAction(
	'[Project] Set Track Name',
	props<{ trackIndex: number; name: string }>()
);

export const setTrackColor = createAction(
	'[Project] Set Track Color',
	props<{ trackIndex: number; color: string }>()
);

export const setTrackInstrument = createAction(
	'[Project] Set Track Instrument',
	props<{ trackIndex: number; instrument: string }>()
);

export const addTrackEffect = createAction(
	'[Project] Add Track Effect',
	props<{ trackIndex: number; effect: string }>()
);

export const removeTrackEffect = createAction(
	'[Project] Remove Track Effect',
	props<{ trackIndex: number; effectIndex: number }>()
);

// =====================================================================================
// Regions
// =====================================================================================

export const addRegion = createAction(
	'[Project] Add Region',
	props<{ trackIndex: number; region: AudioRegion | MidiRegion }>()
);

export const updateRegion = createAction(
	'[Project] Update Region',
	props<{ 
		trackIndex: number; 
		regionIndex: number; 
		updates: Partial<AudioRegion | MidiRegion> 
	}>()
);

export const removeRegion = createAction(
	'[Project] Remove Region',
	props<{ trackIndex: number; regionIndex: number }>()
);

export const moveRegion = createAction(
	'[Project] Move Region',
	props<{ 
		fromTrackIndex: number; 
		toTrackIndex: number; 
		regionIndex: number; 
		newStart: number 
	}>()
);

export const duplicateRegion = createAction(
	'[Project] Duplicate Region',
	props<{ trackIndex: number; regionIndex: number; newStart: number }>()
);

// Audio Region Specific Actions
export const setRegionVolume = createAction(
	'[Project] Set Region Volume',
	props<{ trackIndex: number; regionIndex: number; volume: number }>()
);

export const setRegionPitch = createAction(
	'[Project] Set Region Pitch',
	props<{ trackIndex: number; regionIndex: number; pitch: number }>()
);

export const setRegionTimeStretch = createAction(
	'[Project] Set Region Time Stretch',
	props<{ trackIndex: number; regionIndex: number; timeStretch: number }>()
);

export const setRegionFades = createAction(
	'[Project] Set Region Fades',
	props<{ trackIndex: number; regionIndex: number; fadeIn: number; fadeOut: number }>()
);

// =====================================================================================
// Audio Files
// =====================================================================================

export const addFile = createAction(
	'[Project] Add File',
	props<{ file: BaseFile }>()
);

export const updateFile = createAction(
	'[Project] Update File',
	props<{ fileId: string; updates: Partial<BaseFile> }>()
);

export const removeFile = createAction(
	'[Project] Remove File',
	props<{ fileId: string }>()
);

export const updateAudioFileBuffer = createAction(
	'[Project] Update Audio File Buffer',
	props<{ 
		fileId: string; 
		bufferType: 'original' | 'mp3_320' | 'mp3_128' | 'preview';
		buffer?: AudioBuffer;
		cacheKey?: string;
	}>()
);

export const setAudioFileLoading = createAction(
	'[Project] Set Audio File Loading',
	props<{ 
		fileId: string; 
		bufferType: 'original' | 'mp3_320' | 'mp3_128' | 'preview';
		loading: boolean;
	}>()
);

export const updateMidiFileData = createAction(
	'[Project] Update MIDI File Data',
	props<{ fileId: string; midiJson: {} }>()
);
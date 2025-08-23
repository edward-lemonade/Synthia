import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProjectState } from './state.interface';
import { AudioFile, AudioRegion, MidiFile, MidiRegion } from '@shared/types';

export const selectProjectState = createFeatureSelector<ProjectState>('project');

// =====================================================================================
// Project
// =====================================================================================

export const selectProject = createSelector(
	selectProjectState,
	(state) => ({ metadata: state.metadata, studio: state.studio })
);

export const selectProjectLoading = createSelector(
	selectProjectState,
	(state) => state.loading
);

export const selectProjectSaving = createSelector(
	selectProjectState,
	(state) => state.saving
);

export const selectProjectError = createSelector(
	selectProjectState,
	(state) => state.error
);

export const selectHasUnsavedChanges = createSelector(
	selectProjectState,
	(state) => state.hasUnsavedChanges
);

export const selectLastSaved = createSelector(
	selectProjectState,
	(state) => state.lastSaved
);

// =====================================================================================
// Metadata
// =====================================================================================

export const selectProjectMetadata = createSelector(
	selectProjectState,
	(state) => state.metadata
);

export const selectProjectId = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.projectId
);

export const selectProjectTitle = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.title
);

export const selectProjectAuthors = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.authors ?? []
);

export const selectIsCollaboration = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.isCollaboration ?? false
);

export const selectIsRemix = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.isRemix ?? false
);

export const selectRemixOf = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.isRemixOf
);

export const selectIsReleased = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.isReleased ?? false
);

export const selectProjectDates = createSelector(
	selectProjectMetadata,
	(metadata) => metadata ? {
		createdAt: metadata.createdAt,
		updatedAt: metadata.updatedAt
	} : null
);

export const selectProjectCreatedAt = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.createdAt
);

export const selectProjectUpdatedAt = createSelector(
	selectProjectMetadata,
	(metadata) => metadata?.updatedAt
);

// =====================================================================================
// Studio Globals
// =====================================================================================

export const selectProjectStudio = createSelector(
	selectProjectState,
	(state) => state.studio
);

export const selectBpm = createSelector(
	selectProjectStudio,
	(studio) => studio?.bpm ?? 120
);

export const selectKey = createSelector(
	selectProjectStudio,
	(studio) => studio?.key ?? { root: 'C', mode: 'major' }
);

export const selectTimeSignature = createSelector(
	selectProjectStudio,
	(studio) => studio?.timeSignature ?? { numerator: 4, denominator: 4 }
);

export const selectMasterVolume = createSelector(
	selectProjectStudio,
	(studio) => studio?.masterVolume ?? 100
);

export const selectCentOffset = createSelector(
	selectProjectStudio,
	(studio) => studio?.centOffset ?? 0
);

export const selectStudioSettings = createSelector(
	selectBpm,
	selectKey,
	selectTimeSignature,
	selectMasterVolume,
	selectCentOffset,
	(bpm, key, timeSignature, masterVolume, centOffset) => ({
		bpm,
		key,
		timeSignature,
		masterVolume,
		centOffset
	})
);

// =====================================================================================
// Tracks
// =====================================================================================

export const selectTracks = createSelector(
	selectProjectStudio,
	(studio) => studio?.tracks ?? []
);

export const selectTrack = (trackIndex: number) => createSelector(
	selectTracks,
	(tracks) => tracks[trackIndex]
);

export const selectTrackById = (trackId: string) => createSelector(
	selectTracks,
	(tracks) => tracks.find(track => track.index.toString() === trackId)
);

export const selectTrackCount = createSelector(
	selectTracks,
	(tracks) => tracks.length
);

export const selectTracksByType = (trackType: 'audio' | 'microphone' | 'instrument' | 'drums') => createSelector(
	selectTracks,
	(tracks) => tracks.filter(track => track.trackType === trackType)
);

export const selectAudioTracks = createSelector(
	selectTracks,
	(tracks) => tracks.filter(track => track.trackType === 'audio')
);

export const selectInstrumentTracks = createSelector(
	selectTracks,
	(tracks) => tracks.filter(track => track.trackType === 'instrument')
);

export const selectSoloedTracks = createSelector(
	selectTracks,
	(tracks) => tracks.filter(track => track.solo)
);

export const selectMutedTracks = createSelector(
	selectTracks,
	(tracks) => tracks.filter(track => track.mute)
);

export const selectActiveTracks = createSelector(
	selectTracks,
	selectSoloedTracks,
	(tracks, soloedTracks) => {
		// If any tracks are soloed, only soloed tracks are active
		if (soloedTracks.length > 0) {
			return soloedTracks;
		}
		// Otherwise, all non-muted tracks are active
		return tracks.filter(track => !track.mute);
	}
);

export const selectTrackNames = createSelector(
	selectTracks,
	(tracks) => tracks.map(track => track.name)
);

export const selectTrackColors = createSelector(
	selectTracks,
	(tracks) => tracks.map(track => track.color)
);

// =====================================================================================
// Regions
// =====================================================================================

export const selectAllRegions = createSelector(
	selectTracks,
	(tracks) => tracks.flatMap((track, trackIndex) => 
		track.regions.map((region, regionIndex) => ({ 
			...region, 
			trackIndex,
			regionIndex 
		}))
	)
);

export const selectRegionsByTrack = (trackIndex: number) => createSelector(
	selectTrack(trackIndex),
	(track) => track?.regions ?? []
);

export const selectRegion = (trackIndex: number, regionIndex: number) => createSelector(
	selectTrack(trackIndex),
	(track) => track?.regions[regionIndex]
);

export const selectAudioRegions = createSelector(
	selectAllRegions,
	(regions) => regions.filter(region => region.type === 'audio') as (AudioRegion & { trackIndex: number; regionIndex: number })[]
);

export const selectMidiRegions = createSelector(
	selectAllRegions,
	(regions) => regions.filter(region => region.type === 'midi') as (MidiRegion & { trackIndex: number; regionIndex: number })[]
);

export const selectRegionsByTimeRange = (startTime: number, endTime: number) => createSelector(
	selectAllRegions,
	(regions) => regions.filter(region => {
		const regionEnd = region.start + region.duration;
		return region.start < endTime && regionEnd > startTime;
	})
);

export const selectRegionsByFile = (fileIndex: number) => createSelector(
	selectAllRegions,
	(regions) => regions.filter(region => region.fileIndex === fileIndex)
);

export const selectProjectDuration = createSelector(
	selectAllRegions,
	(regions) => {
		if (regions.length === 0) return 0;
		return Math.max(...regions.map(region => region.start + region.duration));
	}
);

// =====================================================================================
// Audio Files
// =====================================================================================

export const selectFiles = createSelector(
	selectProjectStudio,
	(studio) => studio?.files ?? []
);

export const selectFile = (fileId: string) => createSelector(
	selectFiles,
	(files) => files.find(file => file.fileId === fileId)
);

export const selectFileByIndex = (fileIndex: number) => createSelector(
	selectFiles,
	(files) => files[fileIndex]
);

export const selectAudioFiles = createSelector(
	selectFiles,
	(files) => files.filter(file => file.type === 'audio') as AudioFile[]
);

export const selectMidiFiles = createSelector(
	selectFiles,
	(files) => files.filter(file => file.type === 'midi') as MidiFile[]
);

export const selectFilesByType = (type: 'audio' | 'midi') => createSelector(
	selectFiles,
	(files) => files.filter(file => file.type === type)
);

export const selectFilesByFormat = (format: 'wav' | 'mp3' | 'flac' | 'aiff' | 'midi' | 'mid') => createSelector(
	selectFiles,
	(files) => files.filter(file => file.format === format)
);

export const selectFileCount = createSelector(
	selectFiles,
	(files) => files.length
);

export const selectAudioFileCount = createSelector(
	selectAudioFiles,
	(audioFiles) => audioFiles.length
);

export const selectMidiFileCount = createSelector(
	selectMidiFiles,
	(midiFiles) => midiFiles.length
);

// Audio File Buffer Selectors
export const selectAudioFileBuffers = (fileId: string) => createSelector(
	selectFile(fileId),
	(file) => {
		if (file?.type === 'audio') {
			const audioFile = file as AudioFile;
			return audioFile.audio;
		}
		return null;
	}
);

export const selectAudioFileBuffer = (fileId: string, bufferType: 'original' | 'mp3_320' | 'mp3_128' | 'preview') => createSelector(
	selectAudioFileBuffers(fileId),
	(audio) => audio?.[bufferType]
);

export const selectAudioFileCacheKey = (fileId: string, bufferType: 'original' | 'mp3_320' | 'mp3_128' | 'preview') => createSelector(
	selectAudioFileBuffers(fileId),
	(audio) => audio?.cache[bufferType]
);

export const selectAudioFileLoading = (fileId: string, bufferType: 'original' | 'mp3_320' | 'mp3_128' | 'preview') => createSelector(
	selectAudioFileBuffers(fileId),
	(audio) => audio?.loading[bufferType] ?? false
);

export const selectAnyAudioFileLoading = createSelector(
	selectAudioFiles,
	(audioFiles) => audioFiles.some(file => 
		Object.values(file.audio.loading).some(loading => loading)
	)
);

export const selectLoadedAudioFiles = createSelector(
	selectAudioFiles,
	(audioFiles) => audioFiles.filter(file => 
		file.audio.original || file.audio.mp3_320 || file.audio.mp3_128 || file.audio.preview
	)
);

// =====================================================================================
// Composite
// =====================================================================================

export const selectProjectSummary = createSelector(
	selectProjectMetadata,
	selectTrackCount,
	selectFileCount,
	selectProjectDuration,
	(metadata, trackCount, fileCount, duration) => ({
		id: metadata?.projectId,
		title: metadata?.title,
		authors: metadata?.authors,
		trackCount,
		fileCount,
		duration,
		isCollaboration: metadata?.isCollaboration,
		isRemix: metadata?.isRemix,
		isReleased: metadata?.isReleased,
		createdAt: metadata?.createdAt,
		updatedAt: metadata?.updatedAt
	})
);

export const selectTrackSummaries = createSelector(
	selectTracks,
	(tracks) => tracks.map(track => ({
		index: track.index,
		name: track.name,
		color: track.color,
		type: track.trackType,
		regionCount: track.regions.length,
		volume: track.volume,
		pan: track.pan,
		mute: track.mute,
		solo: track.solo,
		effectCount: track.effects.length,
		instrument: track.instrument
	}))
);

export const selectPlaybackState = createSelector(
	selectActiveTracks,
	selectBpm,
	selectTimeSignature,
	selectMasterVolume,
	(activeTracks, bpm, timeSignature, masterVolume) => ({
		activeTracks,
		bpm,
		timeSignature,
		masterVolume
	})
);

export const selectMixerState = createSelector(
	selectTracks,
	selectMasterVolume,
	(tracks, masterVolume) => ({
		masterVolume,
		tracks: tracks.map(track => ({
			index: track.index,
			name: track.name,
			volume: track.volume,
			pan: track.pan,
			mute: track.mute,
			solo: track.solo,
			effects: track.effects
		}))
	})
);

export const selectTimelineState = createSelector(
	selectTracks,
	selectBpm,
	selectTimeSignature,
	selectProjectDuration,
	(tracks, bpm, timeSignature, duration) => ({
		tracks: tracks.map(track => ({
			index: track.index,
			name: track.name,
			color: track.color,
			regions: track.regions
		})),
		bpm,
		timeSignature,
		duration
	})
);

// Validation Selectors
export const selectIsValidProject = createSelector(
	selectProjectMetadata,
	selectProjectStudio,
	(metadata, studio) => !!(metadata && studio)
);

export const selectCanSaveProject = createSelector(
	selectIsValidProject,
	selectHasUnsavedChanges,
	selectProjectSaving,
	(isValid, hasChanges, isSaving) => isValid && hasChanges && !isSaving
);

export const selectProjectErrors = createSelector(
	selectProjectMetadata,
	selectTracks,
	selectFiles,
	(metadata, tracks, files) => {
		const errors: string[] = [];
		
		if (!metadata?.title?.trim()) {
			errors.push('Project title is required');
		}
		
		if (metadata?.authors?.length === 0) {
			errors.push('At least one author is required');
		}
		
		// Check for orphaned regions (regions that reference non-existent files)
		const fileIndices = new Set(files.map((_, index) => index));
		tracks.forEach((track, trackIndex) => {
			track.regions.forEach((region, regionIndex) => {
				if (!fileIndices.has(region.fileIndex)) {
					errors.push(`Track ${trackIndex} region ${regionIndex} references missing file`);
				}
			});
		});
		
		return errors;
	}
);

export const selectHasProjectErrors = createSelector(
	selectProjectErrors,
	(errors) => errors.length > 0
);
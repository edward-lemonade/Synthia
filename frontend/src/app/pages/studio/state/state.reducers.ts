import { createFeature, createReducer, on } from '@ngrx/store';
import * as ProjectActions from './state.actions';
import { DEFAULT_STATE } from './state.interface';
import { AudioFile, DefaultKey, DefaultTimeSignature, Key, MidiFile } from '@shared/types';

export const projectReducer = createReducer(
	DEFAULT_STATE,
	
	// =====================================================================================
	// Project
	// =====================================================================================

	on(ProjectActions.loadProject, (state) => ({
		...state,
		loading: true,
		error: null
	})),
	
	on(ProjectActions.loadProjectSuccess, (state, { metadata, studio }) => ({
		...state,
		metadata,
		studio,
		loading: false,
		error: null,
		hasUnsavedChanges: false
	})),
	
	on(ProjectActions.loadProjectFailure, (state, { error }) => ({
		...state,
		loading: false,
		error
	})),
	
	on(ProjectActions.saveProject, (state) => ({
		...state,
		saving: true,
		error: null
	})),
	
	on(ProjectActions.saveProjectSuccess, (state, { metadata, studio }) => ({
		...state,
		metadata,
		studio,
		saving: false,
		error: null,
		hasUnsavedChanges: false,
		lastSaved: new Date()
	})),
	
	on(ProjectActions.saveProjectFailure, (state, { error }) => ({
		...state,
		saving: false,
		error
	})),
	
	on(ProjectActions.createNewProject, (state, { title, authors }) => ({
		...state,
		metadata: {
			projectId: crypto.randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date(),
			title,
			authors,
			isCollaboration: authors.length > 1,
			isRemix: false,
			isRemixOf: null,
			isReleased: false
		},
		studio: {
			bpm: 120,
			key: DefaultKey,
			centOffset: 0,
			timeSignature: DefaultTimeSignature,
			masterVolume: 100,
			tracks: [],
			files: []
		},
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.clearProject, () => DEFAULT_STATE),
	
	// =====================================================================================
	// Metadata
	// =====================================================================================

	on(ProjectActions.updateProjectTitle, (state, { title }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			title,
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.addAuthor, (state, { author }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			authors: [...state.metadata.authors, author],
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.removeAuthor, (state, { authorId }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			authors: state.metadata.authors.filter(author => author.userId !== authorId),
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setCollaborationStatus, (state, { isCollaboration }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			isCollaboration,
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setRemixStatus, (state, { isRemix, isRemixOf }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			isRemix,
			isRemixOf: isRemixOf !== undefined ? isRemixOf : state.metadata.isRemixOf,
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setReleaseStatus, (state, { isReleased }) => ({
		...state,
		metadata: state.metadata ? {
			...state.metadata,
			isReleased,
			updatedAt: new Date()
		} : null,
		hasUnsavedChanges: true
	})),
	
	// =====================================================================================
	// Studio Globals
	// =====================================================================================

	on(ProjectActions.setBpm, (state, { bpm }) => ({
		...state,
		studio: state.studio ? { ...state.studio, bpm } : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setKey, (state, { key }) => ({
		...state,
		studio: state.studio ? { ...state.studio, key } : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setCentOffset, (state, { centOffset }) => ({
		...state,
		studio: state.studio ? { ...state.studio, centOffset } : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTimeSignature, (state, { timeSignature }) => ({
		...state,
		studio: state.studio ? { ...state.studio, timeSignature } : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setMasterVolume, (state, { masterVolume }) => ({
		...state,
		studio: state.studio ? { ...state.studio, masterVolume } : null,
		hasUnsavedChanges: true
	})),
	
	// =====================================================================================
	// Tracks
	// =====================================================================================

	on(ProjectActions.addTrack, (state, { track }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: [...state.studio.tracks, { ...track, index: state.studio.tracks.length }]
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.updateTrack, (state, { trackIndex, updates }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, ...updates } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.removeTrack, (state, { trackIndex }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks
				.filter((_, index) => index !== trackIndex)
				.map((track, index) => ({ ...track, index }))
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.reorderTracks, (state, { fromIndex, toIndex }) => {
		if (!state.studio) return state;
		
		const tracks = [...state.studio.tracks];
		const [movedTrack] = tracks.splice(fromIndex, 1);
		tracks.splice(toIndex, 0, movedTrack);
		
		return {
			...state,
			studio: {
				...state.studio,
				tracks: tracks.map((track, index) => ({ ...track, index }))
			},
			hasUnsavedChanges: true
		};
	}),
	
	on(ProjectActions.muteTrack, (state, { trackIndex, mute }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, mute } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.soloTrack, (state, { trackIndex, solo }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, solo } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTrackVolume, (state, { trackIndex, volume }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, volume } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTrackPan, (state, { trackIndex, pan }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, pan } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTrackName, (state, { trackIndex, name }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, name } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTrackColor, (state, { trackIndex, color }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, color } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setTrackInstrument, (state, { trackIndex, instrument }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? { ...track, instrument } : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.addTrackEffect, (state, { trackIndex, effect }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? {
					...track,
					effects: [...track.effects, effect]
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.removeTrackEffect, (state, { trackIndex, effectIndex }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? {
					...track,
					effects: track.effects.filter((_, eIndex) => eIndex !== effectIndex)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	// =====================================================================================
	// Regions
	// =====================================================================================

	on(ProjectActions.addRegion, (state, { trackIndex, region }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, index) =>
				index === trackIndex ? {
					...track,
					regions: [...track.regions, region]
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.updateRegion, (state, { trackIndex, regionIndex, updates }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.map((region, rIndex) =>
						rIndex === regionIndex ? { ...region, ...updates } : region
					)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.removeRegion, (state, { trackIndex, regionIndex }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.filter((_, rIndex) => rIndex !== regionIndex)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.moveRegion, (state, { fromTrackIndex, toTrackIndex, regionIndex, newStart }) => {
		if (!state.studio) return state;
		
		const fromTrack = state.studio.tracks[fromTrackIndex];
		if (!fromTrack || !fromTrack.regions[regionIndex]) return state;
		
		const regionToMove = { ...fromTrack.regions[regionIndex], start: newStart };
		
		return {
			...state,
			studio: {
				...state.studio,
				tracks: state.studio.tracks.map((track, tIndex) => {
					if (tIndex === fromTrackIndex) {
						return {
							...track,
							regions: track.regions.filter((_, rIndex) => rIndex !== regionIndex)
						};
					} else if (tIndex === toTrackIndex) {
						return {
							...track,
							regions: [...track.regions, regionToMove]
						};
					}
					return track;
				})
			},
			hasUnsavedChanges: true
		};
	}),
	
	on(ProjectActions.duplicateRegion, (state, { trackIndex, regionIndex, newStart }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: [
						...track.regions,
						{ ...track.regions[regionIndex], start: newStart }
					]
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	// Audio Region Specific Actions
	on(ProjectActions.setRegionVolume, (state, { trackIndex, regionIndex, volume }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.map((region, rIndex) =>
						rIndex === regionIndex && region.type === 'audio' ? 
							{ ...region, volume } : region
					)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setRegionPitch, (state, { trackIndex, regionIndex, pitch }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.map((region, rIndex) =>
						rIndex === regionIndex && region.type === 'audio' ? 
							{ ...region, pitch } : region
					)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setRegionTimeStretch, (state, { trackIndex, regionIndex, timeStretch }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.map((region, rIndex) =>
						rIndex === regionIndex && region.type === 'audio' ? 
							{ ...region, timeStretch } : region
					)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.setRegionFades, (state, { trackIndex, regionIndex, fadeIn, fadeOut }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			tracks: state.studio.tracks.map((track, tIndex) =>
				tIndex === trackIndex ? {
					...track,
					regions: track.regions.map((region, rIndex) =>
						rIndex === regionIndex && region.type === 'audio' ? 
							{ ...region, fadeIn, fadeOut } : region
					)
				} : track
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	// =====================================================================================
	// Audio Files
	// =====================================================================================

	on(ProjectActions.addFile, (state, { file }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: [...state.studio.files, file]
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.updateFile, (state, { fileId, updates }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: state.studio.files.map(file =>
				file.fileId === fileId ? { ...file, ...updates } : file
			)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.removeFile, (state, { fileId }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: state.studio.files.filter(file => file.fileId !== fileId)
		} : null,
		hasUnsavedChanges: true
	})),
	
	on(ProjectActions.updateAudioFileBuffer, (state, { fileId, bufferType, buffer, cacheKey }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: state.studio.files.map(file => {
				if (file.fileId === fileId && file.type === 'audio') {
					const audioFile = file as AudioFile;
					return {
						...audioFile,
						audio: {
							...audioFile.audio,
							...(buffer ? { [bufferType]: buffer } : {}),
							cache: {
								...audioFile.audio.cache,
								...(cacheKey ? { [bufferType]: cacheKey } : {})
							},
							loading: {
								...audioFile.audio.loading,
								[bufferType]: false
							}
						}
					};
				}
				return file;
			})
		} : null
	})),
	
	on(ProjectActions.setAudioFileLoading, (state, { fileId, bufferType, loading }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: state.studio.files.map(file => {
				if (file.fileId === fileId && file.type === 'audio') {
					const audioFile = file as AudioFile;
					return {
						...audioFile,
						audio: {
							...audioFile.audio,
							loading: {
								...audioFile.audio.loading,
								[bufferType]: loading
							}
						}
					};
				}
				return file;
			})
		} : null
	})),
	
	on(ProjectActions.updateMidiFileData, (state, { fileId, midiJson }) => ({
		...state,
		studio: state.studio ? {
			...state.studio,
			files: state.studio.files.map(file => {
				if (file.fileId === fileId && file.type === 'midi') {
					return { ...file, midiJson } as MidiFile;
				}
				return file;
			})
		} : null,
		hasUnsavedChanges: true
	}))
);

export const projectFeature = createFeature({
	name: 'project',
	reducer: projectReducer,
});
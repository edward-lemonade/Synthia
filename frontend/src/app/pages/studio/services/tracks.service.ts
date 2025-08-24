import { computed, Injectable, Injector, Signal } from "@angular/core";
import { AudioRegion, MidiRegion, RegionType, regionTypeFromTrack, Track, TrackType } from "@shared/types";
import { StateService } from "../state/state.service";
import { DEFAULT_AUDIO_REGION, DEFAULT_AUDIO_TRACK, DEFAULT_MIDI_REGION, DEFAULT_MIDI_TRACK } from "../state/state.defaults";
import { createState } from "../state/state.factory";

export interface RegionPath {
	trackIndex: number;
	regionIndex: number;
}

@Injectable()
export class TracksService {
	readonly COLORS = [
		'#d7e166ff',
		'#e19f66ff',
		'#e16666ff',
		'#de83f7ff',
		'#aaa3ffff',
		'#66e1e1ff',
		'#8de166ff',
	]

	get tracks() { return this.studioState.state.studio.tracks; }
	declare readonly numTracks : Signal<number>;

	constructor(
		private studioState: StateService,
	) {
		this.numTracks = computed(() => {
			const len = this.tracks().length;
			return len;
		});
	}

	// ========================================================
	// Track Operations

	addTrack(type: TrackType, overrides: Partial<Track> = {}) {
		let regionType = regionTypeFromTrack(type);

		let baseTrack: Track =
			regionType === RegionType.Audio
			? { ...DEFAULT_AUDIO_TRACK, color: this.nextTrackColor() }
			: { ...DEFAULT_MIDI_TRACK, color: this.nextTrackColor() };

		let newTrack: Track = {
			...baseTrack,
			...overrides,
			trackType: type,
			index: this.numTracks(), // always enforce index last
		};

		let newTrackState = createState(newTrack, this.studioState);
		this.tracks.update(tracks => [...tracks, newTrackState]);
	}
	deleteTrack(index: number) {
		this.tracks.update(tracks =>
			tracks.filter((_, i) => i !== index)
		);
	}
	moveTrack(index: number, newIndex: number) {
		this.tracks.update(tracks => {
			if (index < 0 || index >= tracks.length || newIndex < 0 || newIndex >= tracks.length) {
				return tracks; 
			}

			const updated = [...tracks];
			const [moved] = updated.splice(index, 1); // remove from old position
			updated.splice(newIndex, 0, moved);       // insert at new position
			return updated;
		});
	}
	duplicateTrack(index: number) {
		this.tracks.update(tracks => {
			if (index < 0 || index >= tracks.length) return tracks;

			const updated = [...tracks];
			const trackToDuplicate = { ...tracks[index] }; 	// shallow copy
			updated.splice(index + 1, 0, trackToDuplicate); // insert after original
			return updated;
		});
	}

	nextTrackColor() {
		return this.COLORS[this.numTracks() % this.COLORS.length];
	}

	// ========================================================
	// Region Operations

	addAudioRegion(trackIndex: number, overrides: Partial<AudioRegion> = {}) {
		if (trackIndex < 0 || trackIndex >= this.tracks().length) return;

		const region: AudioRegion = {
			...DEFAULT_AUDIO_REGION,
			...overrides,
			trackIndex, 
		};

		const newRegionState = createState(region, this.studioState);

		this.tracks()[trackIndex].regions.update(regions => [
			...regions,
			newRegionState,
		]);
	}
	addMidiRegion(trackIndex: number, overrides: Partial<MidiRegion> = {}) {
		if (trackIndex < 0 || trackIndex >= this.tracks().length) return;

		const region: MidiRegion = {
			...DEFAULT_MIDI_REGION,
			...overrides,
			trackIndex, 
		};

		const newRegionState = createState(region, this.studioState);

		this.tracks()[trackIndex].regions.update(regions => [
			...regions,
			newRegionState,
		]);
	}
	deleteRegion(path: RegionPath) {
		this.tracks()[path.trackIndex].regions.update(regions => 
			regions.filter((_, i) => i !== path.regionIndex)
		);
	}
	deleteRegions(paths: RegionPath[]) {
		const byTrack = new Map<number, number[]>();
		for (const p of paths) {
			if (!byTrack.has(p.trackIndex)) byTrack.set(p.trackIndex, []);
			byTrack.get(p.trackIndex)!.push(p.regionIndex);
		}

		byTrack.forEach((indices, trackIndex) => {
			this.tracks()[trackIndex].regions.update(regions =>
				regions.filter((_, i) => !indices.includes(i))
			);
		});
	}
	moveRegion(path: RegionPath, newTrackIndex: number, newStart: number) { // ensure this results in the expected reactivity
		const track = this.tracks()[path.trackIndex];
		const region = track.regions()[path.regionIndex];

		track.regions.update(regions => {
			const updated = [...regions];
			updated.splice(path.regionIndex, 1);
			return updated;
		});

		const movedRegion = {...region};
		movedRegion.trackIndex.set(newTrackIndex);
		movedRegion.start.set(newStart);

		this.tracks()[newTrackIndex].regions.update(regions => [...regions, movedRegion]);
	}
	moveRegions(paths: RegionPath[], trackIndexOffset: number, startOffset: number) {
		if (paths.length === 0) return;

		// Collect regions and group by original track
		const regionsToMove: { region: any; newTrackIndex: number }[] = [];
		const regionsByTrack = new Map<number, number[]>();

		paths.forEach(path => {
			const currentTrack = path.trackIndex;
			const region = this.tracks()[currentTrack].regions()[path.regionIndex];
			const newTrackIndex = currentTrack + trackIndexOffset;

			regionsToMove.push({ region, newTrackIndex });

			if (!regionsByTrack.has(currentTrack)) regionsByTrack.set(currentTrack, []);
			regionsByTrack.get(currentTrack)!.push(path.regionIndex);
		});

		// Remove regions from original tracks (highest index first)
		regionsByTrack.forEach((indices, trackIndex) => {
			const sorted = indices.slice().sort((a, b) => b - a);
			this.tracks()[trackIndex].regions.update(regions => {
			const updated = [...regions];
			for (const i of sorted) updated.splice(i, 1);
			return updated;
			});
		});

		// Insert moved regions into their new tracks
		regionsToMove.forEach(({ region, newTrackIndex }) => {
			const copy = { ...region };
			copy.trackIndex.set(newTrackIndex);
			copy.start.set(copy.start() + startOffset);

			this.tracks()[newTrackIndex].regions.update(regions => [...regions, copy]);
		});
	}
	duplicateRegion(path: RegionPath) {
		const track = this.tracks()[path.trackIndex];
		const region = track.regions()[path.regionIndex];

		const copy = { ...region }; 

		track.regions.update(regions => {
			const updated = [...regions];
			updated.splice(path.regionIndex + 1, 0, copy); 
			return updated;
		});
	}
}
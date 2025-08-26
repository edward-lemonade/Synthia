import { computed, Injectable, Injector, Signal } from "@angular/core";
import { AudioRegion, MidiRegion, Region, RegionType, regionTypeFromTrack, Track, TrackType } from "@shared/types";
import { StateService } from "../state/state.service";
import { AUDIO_REGION_DEFAULTS, AUDIO_TRACK_DEFAULTS, MIDI_REGION_DEFAULTS, MIDI_TRACK_DEFAULTS } from "../state/state.defaults";
import { StateNode, stateNode } from "../state/state.factory";

export interface RegionPath {
	trackIndex: number;
	regionIndex: number;
}

@Injectable()
export class TracksService {
	private static _instance: TracksService;
	static get instance(): TracksService { return TracksService._instance; }

	constructor() {
		TracksService._instance = this;
		
		this.numTracks = computed(() => {
			const len = this.tracks().length;
			return len;
		});
	}

	get stateService() { return StateService.instance }

	readonly COLORS = [
		'#d7e166ff',
		'#e19f66ff',
		'#e16666ff',
		'#de83f7ff',
		'#aaa3ffff',
		'#66e1e1ff',
		'#8de166ff',
	]

	get tracks() { return this.stateService.state.studio.tracks; }
	declare readonly numTracks : Signal<number>;

	// ========================================================
	// Track Operations

	addTrack(type: TrackType, overrides: Partial<Track> = {}) {
		let regionType = regionTypeFromTrack(type);
		let newIndex = this.numTracks();

		let baseTrack: Track =
			regionType === RegionType.Audio
			? { ...AUDIO_TRACK_DEFAULTS, color: this.nextTrackColor() }
			: { ...MIDI_TRACK_DEFAULTS, color: this.nextTrackColor() };

		let newTrack: Track = {
			...baseTrack,
			...overrides,
			trackType: type,
			index: newIndex, // always enforce index last
		};

		this.tracks.push(newTrack);
	}
	deleteTrack(index: number) {
		this.tracks.update(tracks => {
			const newTracks = tracks.filter((_, i) => i !== index);
			newTracks.forEach((track, idx) => {
				track.getKey = () => idx;
			});
			return newTracks;
		});
	}
	moveTrack(index: number, newIndex: number) {
		if (index < 0 || index >= this.numTracks() || newIndex < 0 || newIndex >= this.numTracks()) { return; }

		const [moved] = this.tracks.splice(index, 1);
		this.tracks.splice(newIndex, 0, moved);
	}
	duplicateTrack(index: number) {
		if (index < 0 || index >= this.tracks().length) return;

		const trackToDuplicate = { ...this.tracks()[index].snapshot() };
		this.tracks.push(trackToDuplicate); 
	}
	nextTrackColor() {
		return this.COLORS[this.numTracks() % this.COLORS.length];
	}

	// ========================================================
	// Region Operations

	addAudioRegion(trackIndex: number, overrides: Partial<AudioRegion> = {}) {
		if (trackIndex < 0 || trackIndex >= this.tracks().length) return;

		const region: AudioRegion = {
			...AUDIO_REGION_DEFAULTS,
			...overrides,
			trackIndex, 
		};

		const newRegionState = stateNode(region, this.stateService);

		this.tracks()[trackIndex].regions.update(regions => [
			...regions,
			newRegionState,
		]);
	}
	addMidiRegion(trackIndex: number, overrides: Partial<MidiRegion> = {}) {
		if (trackIndex < 0 || trackIndex >= this.tracks().length) return;

		const region: MidiRegion = {
			...MIDI_REGION_DEFAULTS,
			...overrides,
			trackIndex, 
		};

		const newRegionState = stateNode(region, this.stateService);

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

		const extracted: { region: StateNode<Region>, newTrackIndex: number }[] = [];

		// 1. Extract regions and determine new track index
		for (const path of paths) {
			const region = this.tracks()[path.trackIndex].regions()[path.regionIndex];
			const newTrackIndex = path.trackIndex + trackIndexOffset;
			extracted.push({ region, newTrackIndex });
		}

		// 2. Remove from original tracks if moving to a different track
		if (trackIndexOffset !== 0) {
			const regionsByTrack = new Map<number, number[]>();
			for (const path of paths) {
				const idxs = regionsByTrack.get(path.trackIndex) ?? [];
				idxs.push(path.regionIndex);
				regionsByTrack.set(path.trackIndex, idxs);
			}

			for (const [trackIndex, indices] of regionsByTrack.entries()) {
				const regionsSignal = this.tracks()[trackIndex].regions;
				const toRemove = new Set(indices);
				regionsSignal.update(r => {
					const kept = r.filter((_, i) => !toRemove.has(i));
					return kept;
				});
			}

			for (const { region, newTrackIndex } of extracted) {
				region.start.set(region.start() + startOffset);
				region.trackIndex.set(newTrackIndex);
				const paste = region.snapshot();
				this.tracks()[newTrackIndex].regions.push(paste);
			}
		} else {
			for (const { region, newTrackIndex } of extracted) {
				region.start.set(region.start() + startOffset);
			}
		}
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
import { computed, Injectable, Injector, Signal } from "@angular/core";
import { AudioRegion, AudioTrackType, MidiRegion, Region, RegionType, regionTypeFromTrack, Track, TrackType } from "@shared/types";
import { StateService } from "../state/state.service";
import { AUDIO_REGION_DEFAULTS, AUDIO_TRACK_DEFAULTS, MIDI_REGION_DEFAULTS, MIDI_TRACK_DEFAULTS } from "../state/state.defaults";
import { StateNode, stateNode } from "../state/state.factory";
import { AudioCacheService } from "./audio-cache.service";
import { ViewportService } from "./viewport.service";

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
	async addNewAudioTrack(file: File) {
		const cachedAudioFile = await AudioCacheService.instance.addAudioFile(file);
		const name = file.name.replace(/\.[^/.]+$/, "");

		// New Audio Track
		const trackIndex = this.numTracks();
		const trackProps : Partial<Track> = {
			name: name
		}
		this.addTrack(AudioTrackType.Audio, trackProps);
		
		// New Audio Region
		const durationInMeasures = ViewportService.instance.timeToPos(cachedAudioFile.duration);
		const regionProps : Partial<AudioRegion> = {
			fileId: cachedAudioFile.fileId,
			start: 0,
			duration: durationInMeasures,
			fullStart: 0,
			fullDuration: durationInMeasures,
			audioStartOffset: 0,
			audioEndOffset: cachedAudioFile.duration,
		}
		this.addAudioRegion(trackIndex, regionProps);
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

		this.tracks()[trackIndex].regions.push(region);
	}
	addMidiRegion(trackIndex: number, overrides: Partial<MidiRegion> = {}) {
		if (trackIndex < 0 || trackIndex >= this.tracks().length) return;

		const region: MidiRegion = {
			...MIDI_REGION_DEFAULTS,
			...overrides,
			trackIndex, 
		};

		this.tracks()[trackIndex].regions.push(region);
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
	transferRegionToTrack(path: RegionPath, newTrackIndex: number) {
		const sourceTrack = this.tracks()[path.trackIndex];
		const targetTrack = this.tracks()[newTrackIndex];
		const region = sourceTrack.regions()[path.regionIndex];

		sourceTrack.regions.update(regions => { // pop out
			const updated = [...regions];
			updated.splice(path.regionIndex, 1);
			return updated;
		});

		const regionData = region.snapshot();
		regionData.trackIndex = newTrackIndex;

		targetTrack.regions.push(regionData);
	}
	transferRegionsToTrack(paths: RegionPath[], trackIndexOffset: number) {
		paths.forEach(path => {
			this.transferRegionToTrack(path, path.trackIndex + trackIndexOffset);
		});
	}
	moveRegion(path: RegionPath, newStart: number) {
		const region = this.tracks()[path.trackIndex].regions()[path.regionIndex];
		
		region.start.set(newStart);
		if (region.type() === RegionType.Audio) {
			(region as StateNode<AudioRegion>).fullStart.set(newStart);
		}
	}
	moveRegions(paths: RegionPath[], startOffset: number) {
		paths.forEach(path => {
			const region = this.tracks()[path.trackIndex].regions()[path.regionIndex];
			this.moveRegion(path, region.start() + startOffset);
		});
	}
	resizeRegion(path: RegionPath, newStart: number, newDuration: number) {
		const region = this.tracks()[path.trackIndex].regions()[path.regionIndex];
		region.start.set(newStart);
		region.duration.set(newDuration);

		if (region.type() == RegionType.Audio) {
			const audioRegion = (region as StateNode<AudioRegion>);
			audioRegion.audioStartOffset.set(ViewportService.instance.posToTime(newStart - audioRegion.fullStart()));
			audioRegion.audioEndOffset.set(ViewportService.instance.posToTime(newStart + newDuration));
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
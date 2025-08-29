import { computed, Injectable, Injector, Signal } from "@angular/core";
import { AudioRegion, AudioTrackType, MidiRegion, Region, RegionType, regionTypeFromTrack, Track, TrackType } from "@shared/types";
import { StateService } from "../state/state.service";

import { AudioCacheService } from "./audio-cache.service";
import { ViewportService } from "./viewport.service";
import { RegionService } from "./region.service";
import { ObjectStateNode } from "../state/state.factory";

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

	get tracks() { return this.stateService.state.studio.tracks; }
	declare readonly numTracks : Signal<number>;
	
	readonly COLORS = [
		'#d7e166ff',
		'#e19f66ff',
		'#e16666ff',
		'#de83f7ff',
		'#aaa3ffff',
		'#66e1e1ff',
		'#8de166ff',
	]

	// ========================================================
	// Track Operations

	getTrack(key: string | number): ObjectStateNode<Track> | undefined {
		if (typeof key === 'string') {
			return this.tracks.getById(key);
		} else {
			return this.tracks.get(key);
		}
	}
	addTrack(type: TrackType, overrides: Partial<Track> = {}): ObjectStateNode<Track> {
		const newIndex = this.numTracks();
		let newTrack: Partial<Track> = {
			index: newIndex, // always enforce index last
			color: this.nextTrackColor(),
			...overrides,
			trackType: type,
			regionType: regionTypeFromTrack(type),
		};
		return this.tracks.insertValue(newTrack, newIndex);
	}
	async addNewAudioTrack(file: File): Promise<ObjectStateNode<Track>> {
		const cachedAudioFile = await AudioCacheService.instance.addAudioFile(file);
		const name = file.name.replace(/\.[^/.]+$/, "");

		// New Audio Track
		const trackIndex = this.numTracks();
		const trackProps : Partial<Track> = {
			name: name
		}
		const trackNode = this.addTrack(AudioTrackType.Audio, trackProps);
		
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
		RegionService.instance.addAudioRegion(trackNode, regionProps);
		return trackNode;
	}
	deleteTrack(index: number) {
		this.tracks.remove(index);
	}
	moveTrack(index: number, newIndex: number) {
		if (index < 0 || index >= this.numTracks() || newIndex < 0 || newIndex >= this.numTracks()) { return; }
		this.tracks.move(index, newIndex);
	}
	duplicateTrack(index: number) {
		if (index < 0 || index >= this.tracks().length) return;

		const duped = { ...this.tracks()[index].snapshot() };
		this.tracks.insertValue(duped, index+1);
	}
	nextTrackColor() {
		return this.COLORS[this.numTracks() % this.COLORS.length];
	}

	
}
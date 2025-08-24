import { computed, Injectable, Injector, Signal } from "@angular/core";
import { HistoryService } from "./history.service";
import { DEFAULT_AUDIO_REGION, DEFAULT_AUDIO_TRACK, DEFAULT_MIDI_REGION, DEFAULT_MIDI_TRACK, SignalState, SignalStateArray, SignalStateClass, StudioState, WritableStateSignal } from "./substates";
import { Track, Region, AudioRegion, MidiRegion } from "@shared/types";
import { SelectedRegion } from "./region-select.service";

@Injectable()
export class ProjectState {
	readonly COLORS = [
		'#d7e166ff',
		'#e19f66ff',
		'#e16666ff',
		'#de83f7ff',
		'#aaa3ffff',
		'#66e1e1ff',
		'#8de166ff',
	]

	readonly numTracks : Signal<number>;
	get tracks() { return this.studioState.tracks }
	set tracks(t: SignalStateArray<Track>) { this.studioState.tracks = t}

	constructor(
		private injector: Injector,
		private historyService: HistoryService, 
		private studioState: StudioState,
	) {
		this.numTracks = computed(() => {
			const len = this.tracks.lengthSignal();
			return len;
		});
	}

	addTrack(type: string, instrument?: string) {
		let newTrack : Track;
		if (type == "audio") {
			newTrack = DEFAULT_AUDIO_TRACK;
		} else {
			newTrack = DEFAULT_MIDI_TRACK;
			newTrack.instrument = instrument;
		}
		this.studioState.tracks.push(newTrack);
	}
	deleteTrack(index: number) {
		const curr = this.tracks;
		const updated = curr.filter((track, i) => i !== index);
		this.tracks = updated;
	}
	moveTrack(index: number, newIndex: number) {
		const curr = this.tracks;

		if (index < 0 || index >= curr.length || newIndex < 0 || newIndex >= curr.length) return;

		const trackToMove = curr.splice(index, 1)[0];
		curr.splice(newIndex, 0, trackToMove);

		curr.forEach((track, i) => {
			const signal = (track as any).index; // assuming `index` is a signal
			if (signal && typeof signal.setSilent === "function") {
				signal.setSilent(i);
			} else {
				(track as any).index = i;
			}
		});
		this.tracks = curr;
	}
	duplicateTrack(index: number) {
		const curr = this.tracks;
		if (index < 0 || index >= curr.length) return;

		const trackToCopy = curr[index] as SignalStateClass<Track> & SignalState<Track>;
		const newTrack = { ...trackToCopy } as SignalStateClass<Track> & SignalState<Track>;

		if ('name' in newTrack && typeof newTrack.name === 'string') {
			newTrack.name.set(`${newTrack.name}*`);
		}

		this.tracks.push(newTrack);
	}

	addRegion(trackIndex: number,
		type: "audio" | "midi",
		start: number,
		duration: number = 1,
		data: string[] = [],
		fileIndex: number = 0,
	) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length) return;

		const region = (type == "audio") ? DEFAULT_AUDIO_REGION : DEFAULT_MIDI_REGION;
		region.trackIndex = trackIndex;

		const updated = [...curr];
		updated[trackIndex] = {
			...updated[trackIndex],
			regions: [...updated[trackIndex].regions, region]
		};

		this.arr.set(updated);
	}
	deleteRegion(trackIndex: number, regionIndex: number) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length) return;

		const track = curr[trackIndex];
		if (regionIndex < 0 || regionIndex >= track.regions.length) return;

		const updated = [...curr];
		updated[trackIndex] = {
			...updated[trackIndex],
			regions: track.regions.filter((_, i) => i !== regionIndex)
		};

		this.arr.set(updated);
	}
	deleteRegions(selectedRegions: SelectedRegion[]) {
		const regionsByTrack = selectedRegions.reduce((acc, { trackIndex, regionIndex }) => {
			if (!acc[trackIndex]) acc[trackIndex] = [];
			acc[trackIndex].push(regionIndex);
			return acc;
		}, {} as Record<number, number[]>);

		const curr = this.arr();
		const updated = curr.map((track, trackIndex) => {
			if (!regionsByTrack[trackIndex]) return track;

			const indicesToRemove = regionsByTrack[trackIndex].sort((a, b) => b - a);
			const newRegions = [...track.regions];
			for (const i of indicesToRemove) {
				if (i >= 0 && i < newRegions.length) {
					newRegions.splice(i, 1);
				}
			}

			return { ...track, regions: newRegions };
		});

		this.arr.set(updated);
	}
	moveRegion(trackIndex: number, regionIndex: number, newTrackIndex: number, newStart: number) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length || 
			newTrackIndex < 0 || newTrackIndex >= curr.length) return;

		const sourceTrack = curr[trackIndex];
		if (regionIndex < 0 || regionIndex >= sourceTrack.regions.length) return;

		const regionToMove = sourceTrack.regions[regionIndex];
		const movedRegion = {
			...regionToMove,
			start: newStart
		};

		const updated = [...curr];

		updated[trackIndex] = {
			...updated[trackIndex],
			regions: sourceTrack.regions.filter((_, i) => i !== regionIndex)
		};

		updated[newTrackIndex] = {
			...updated[newTrackIndex],
			regions: [...updated[newTrackIndex].regions, movedRegion]
		};

		this.arr.set(updated);
	}
	modifyRegion(trackIndex: number, regionIndex: number, prop: keyof Region, value: any) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length) return;

		const track = curr[trackIndex];
		if (regionIndex < 0 || regionIndex >= track.regions.length) return;

		const updatedRegions = [...track.regions];
		updatedRegions[regionIndex] = {
			...updatedRegions[regionIndex],
			[prop]: value
		};

		const updated = [...curr];
		updated[trackIndex] = {
			...updated[trackIndex],
			regions: updatedRegions
		};

		this.arr.set(updated);
	}
	duplicateRegion(trackIndex: number, regionIndex: number) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length) return;

		const track = curr[trackIndex];
		if (regionIndex < 0 || regionIndex >= track.regions.length) return;

		const regionToCopy = track.regions[regionIndex];
		const newRegion = { ...regionToCopy };

		const updatedRegions = [
			...track.regions.slice(0, regionIndex + 1),
			newRegion,
			...track.regions.slice(regionIndex + 1)
		];

		const updated = [...curr];
		updated[trackIndex] = {
			...updated[trackIndex],
			regions: updatedRegions
		};

		this.arr.set(updated);
	}
}
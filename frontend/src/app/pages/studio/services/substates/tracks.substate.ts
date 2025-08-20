import { Track, ProjectStudioTracks, Region } from "@shared/types";

import { SignalState, SignalStateClass } from "./_base.state";
import { computed, Injector } from "@angular/core";
import { HistoryService } from "../history.service";

export interface ProjectStateTracks extends SignalState<ProjectStudioTracks> {}
export class ProjectStateTracks extends SignalStateClass<ProjectStudioTracks> {
	readonly COLORS = [
		'#d7e166ff',
		'#e19f66ff',
		'#e16666ff',
		'#de83f7ff',
		'#aaa3ffff',
		'#66e1e1ff',
		'#8de166ff',
	]

	constructor(
		injector: Injector,
		historyService: HistoryService, 
		initialData: ProjectStudioTracks,
	) {
		super(
			injector,
			historyService,
			initialData,
			'tracks',
			true,
		);
	}

	readonly numTracks = computed(() => this.arr().length);

	addTrack(type: string, instrument: string = "none") {
		const newTrack : Track = {
			index : this.numTracks(),
			name : "Track",
			color : this.COLORS[this.numTracks() % this.COLORS.length],
			
			type : type as typeof newTrack.type,
			isMidi : (type == "instrument" || type == "drums"),
			instrument : instrument,
		
			volume : 100,
			pan : 0,
			mute : false,
			solo : false,

			effects : [],

			regions : [],
			files : [],
		}
		const curr = this.arr();
		this.arr.set([...curr, newTrack])
	}
	deleteTrack(index: number) {
		const curr = this.arr();
		const updated = curr.filter((track, i) => i !== index);
		this.arr.set(updated);
	}
	moveTrack(index: number, newIndex: number) {
		const curr = this.arr();
		if (index < 0 || index >= curr.length || newIndex < 0 || newIndex >= curr.length) return;

		const updated = [...curr];
		const [trackToMove] = updated.splice(index, 1);
		updated.splice(newIndex, 0, trackToMove);

		const final = updated.map((t, i) => ({ ...t, index: i }));
		this.arr.set(final);
	}
	modifyTrack(index: number, prop: keyof Track, value: any) {
		const curr = this.arr();
		if (index < 0 || index >= curr.length) return;

		const updated = [...curr];
		updated[index] = {
			...updated[index],
			[prop]: value
		};
			
		this.arr.set(updated);
	}
	duplicateTrack(index: number) {
		const curr = this.arr();
		if (index < 0 || index >= curr.length) return;

		const trackToCopy = curr[index];
		const newTrack = { ...trackToCopy };

		if ('name' in newTrack && typeof newTrack.name === 'string') {
			newTrack.name = `${newTrack.name}*`;
		}

		const newArray = [
			...curr.slice(0, index + 1),
			newTrack,
			...curr.slice(index + 1)
		];

		this.arr.set(newArray);
	}

	addRegion(trackIndex: number,
		isMidi: boolean,
		start: number,
		duration: number = 1,
		data: string[] = [],
		fileIndex: number = 0,
	) {
		const curr = this.arr();
		if (trackIndex < 0 || trackIndex >= curr.length) return;

		const region: Region = {
			start: start,
			duration: duration,
			isMidi: isMidi,
			data: data,
			fileIndex: fileIndex,
		}

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

		// Remove region from source track
		updated[trackIndex] = {
			...updated[trackIndex],
			regions: sourceTrack.regions.filter((_, i) => i !== regionIndex)
		};

		// Add region to destination track
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
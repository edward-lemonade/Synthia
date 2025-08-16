import { Track, ProjectStudioTracks } from "@shared/types";

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

	addTrack(type: string) {
		const newTrack : Track = {
			index : this.numTracks(),
			name : "Track",
			type : type as typeof newTrack.type,
			files : null,
			color : this.COLORS[this.numTracks() % this.COLORS.length],
			
			midiInstrument : "none",
		
			volume : 100,
			pan : 0,
			mute : false,
			solo : false,

			effects : [],

			midiData : [],
			clipData : [],
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
}
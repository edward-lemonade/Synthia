import { computed, Injectable, OnInit, WritableSignal } from '@angular/core';
import type { Tracks, Track } from '@shared/types/studio';
import { BaseState } from './base.state';

import { HistoryService } from '../../services/history.service';
import { ActivatedRoute } from '@angular/router';


@Injectable()
export class TracksState extends BaseState<Tracks> {
	constructor(
		historyService: HistoryService, 
	) {
		super(historyService, "tracks");
		historyService.registerTracksService(this);
	}	
	
	override init(state: Tracks) {
		super.init(state);
	}

	readonly numTracks = computed(() => this.get("arr").length);


	addTrack(type: string) {
		const newTrack : Track = {
			index : this.numTracks(),
			name : "Track",
			type : type as typeof newTrack.type,
			files : null,
			color : "white",
			
			midiInstrument : "none",
		
			volume : 100,
			pan : 0,
			mute : false,
			solo : false,

			effects : [],

			midiData : [],
			clipData : [],
		}
		const curr = this.get("arr")();
		this.set("arr", [...curr, newTrack])
	}
	deleteTrack(index: number) {
		const curr = this.get("arr")();
		const updated = curr.filter((track, i) => i !== index);
		this.set("arr", updated);
	}
	moveTrack(index: number, newIndex: number) {
		const curr = this.get("arr")();
		if (index < 0 || index >= curr.length || newIndex < 0 || newIndex >= curr.length) return;

		const updated = [...curr];
		const [track] = updated.splice(index, 1); // Remove the track at `index`
		updated.splice(newIndex, 0, track);       // Insert it at `newIndex`
		updated.forEach((t, i) => t.index = i);

		this.set("arr", updated);
	}

	modifyTrack(index: number, prop: keyof Track, value: any) {
		const curr = this.get("arr")();
		if (index < 0 || index >= curr.length) return;

		const updated = [...curr];
		updated[index] = {
			...updated[index],
			[prop]: value
		};
			
		this.set("arr", updated);
	}
}
import { computed, Injectable, Injector, signal } from "@angular/core";
import { AudioTrackType, MidiTrackType, Track, TrackType } from "@shared/types";
import { RegionSelectService } from "./region-select.service";
import { TracksService } from "./tracks.service";
import { ObjectStateNode } from "../state/state.factory";

export enum MidiTabs {"MIDI Editor"=0, "Instrument"=1, "Effects"=2}
export enum NoTabs {}

@Injectable()
export class CabnetService { // SINGLETON
	private static _instance: CabnetService;
	static get instance(): CabnetService { return CabnetService._instance; }

	constructor(private injector: Injector) {
		CabnetService._instance = this;
	}

	AudioTrackType = AudioTrackType;
	MidiTrackType = MidiTrackType;

	// ==============================================================================================
	// Fields

	isOpen = signal(false);
	trackType = computed<TrackType|null>(() => {
		const trackId = RegionSelectService.instance.selectedTrack();
		if (!trackId) {return null}
		return TracksService.instance.getTrack(trackId)!.trackType();
	});
	selectedTab = signal<MidiTabs|null>(null);
	currentTrackNode = computed<ObjectStateNode<Track>|null>(() => { 
		const trackId = RegionSelectService.instance.selectedTrack();
		return trackId ? (TracksService.instance.getTrack(trackId) ?? null) : null;
	})

	openCabnet(tabOption: MidiTabs = 0) {
		this.isOpen.set(true);
		this.selectedTab.set(tabOption);
	}
	closeCabnet() {
		this.isOpen.set(false);
		this.selectedTab.set(null);
	}

	tabOptions = computed(() => {
		const trackType = this.trackType();
		if (trackType == MidiTrackType.Instrument) {
			return MidiTabs;
		}
		return NoTabs;
	})
}
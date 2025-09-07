import { computed, effect, Injectable, Injector, runInInjectionContext, signal } from "@angular/core";
import { AudioTrackType, MidiTrackType, Track, TrackType } from "@shared/types";
import { RegionSelectService } from "./region-select.service";

export enum MidiTabs {"MIDI Editor"=0, "Instrument"=1}
export enum NoTabs {}

@Injectable()
export class CabnetService { // SINGLETON
	private static _instance: CabnetService;
	static get instance(): CabnetService { return CabnetService._instance; }

	constructor(
		private injector: Injector
	) {
		CabnetService._instance = this;

		runInInjectionContext(this.injector, () => {
			effect(() => {
				const trackType = this.trackType();
				const selectedTrack = this.selectedTrack();

				if (!selectedTrack || !(this.selectedTab()! in this.tabOptions())) {
					this.closeCabnet();
				}
			});
		});
	}

	AudioTrackType = AudioTrackType;
	MidiTrackType = MidiTrackType;

	// ==============================================================================================
	// Fields

	isOpen = signal(false);
	selectedTab = signal<MidiTabs|null>(null);
	get selectedTrack() { return RegionSelectService.instance.selectedTrack ?? null; }
	trackType = computed<TrackType|null>(() => { return RegionSelectService.instance.selectedTrack()?.trackType() ?? null });

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
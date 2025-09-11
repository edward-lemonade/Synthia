import { computed, effect, Injectable, Injector, runInInjectionContext, signal, untracked } from "@angular/core";
import { AudioTrackType, MidiTrackType, Track, TrackType } from "@shared/types";
import { RegionSelectService } from "./region-select.service";
import { MidiEditorComponent } from "../components/studio-cabnet/midi-editor/midi-editor.component";
import { InstrumentSelectorComponent } from "../components/studio-cabnet/instrument-selector/instrument-selector.component";
import { MidiDrumEditorComponent } from "../components/studio-cabnet/midi-drum-editor/midi-editor.component";
import { InstrumentControlsComponent } from "../components/studio-cabnet/instrument-controls/instrument-controls.component";

interface Tab {
	index: number,
	name: string,
	component: any,
}

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

				untracked(() => {
					const isOpen = this.isOpen();
					this.closeCabnet();
					if (isOpen) this.openCabnet();
				});
			});
		});
	}

	AudioTrackType = AudioTrackType;
	MidiTrackType = MidiTrackType;

	TABS: { [key: number]: Tab } = {
		0: {index: 0, name: "MIDI Editor", component: MidiEditorComponent}, // Instrument
		1: {index: 1, name: "Instrument", component: InstrumentSelectorComponent}, // Instrument
		2: {index: 2, name: "MIDI Editor", component: MidiDrumEditorComponent}, // Drums
		3: {index: 3, name: "Instrument", component: InstrumentControlsComponent}, // Drums
	}
	TAB_OPTIONS = {
		[MidiTrackType.Instrument]: [0, 1],
		[MidiTrackType.Drums]: [2, 3],
		[AudioTrackType.Audio]: [],
		[AudioTrackType.Microphone]: [],
	};
	// ==============================================================================================
	// Fields

	isOpen = signal(false);

	get selectedTrack() { return RegionSelectService.instance.selectedTrack ?? null; }
	selectedTabIndex = signal<number | null>(null);
	selectedTabComponent = computed(() => { return this.selectedTabIndex() != null ? this.TABS[this.selectedTabIndex()!].component : null})
	trackType = computed<TrackType|null>(() => { return RegionSelectService.instance.selectedTrack()?.trackType() ?? null });

	openCabnet(tabOption: number = this.TAB_OPTIONS[this.trackType()!][0]) {
		this.isOpen.set(true);
		this.selectedTabIndex.set(tabOption);
	}
	closeCabnet() {
		this.isOpen.set(false);
		this.selectedTabIndex.set(null);
	}

	tabOptions = computed(() => {
		const trackType = this.trackType();
		return (trackType ? this.TAB_OPTIONS[trackType!] : [])
	})
}
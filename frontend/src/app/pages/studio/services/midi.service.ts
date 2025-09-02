import { computed, Injectable, Injector, signal } from "@angular/core";
import { RegionPath } from "./region.service";
import { BoxSelectBounds } from "./select.service";

@Injectable()
export class MidiService { // SINGLETON
	private static _instance: MidiService;
	static get instance(): MidiService { return MidiService._instance; }

	constructor(private injector: Injector) {
		MidiService._instance = this;
	}

	// ==============================================================================================
	// Fields

	readonly selectedNotes = signal<string[]>([]);
  	readonly hasSelectedRegions = computed(() => this.selectedNotes().length > 0);
  	readonly selectedRegionsCount = computed(() => this.selectedNotes().length);

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	public getNormalizedBoxBounds(): BoxSelectBounds | null {
		const bounds = this.boxSelectBounds();
		if (!bounds) return null;

		return {
			startX: Math.min(bounds.startX, bounds.endX),
			startY: Math.min(bounds.startY, bounds.endY),
			endX: Math.max(bounds.startX, bounds.endX),
			endY: Math.max(bounds.startY, bounds.endY)
		};
	}
}
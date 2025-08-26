import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { RegionPath, TracksService } from './tracks.service';
import { StateService } from '../state/state.service';
import { Region } from 'wavesurfer.js/src/plugin/regions';

export interface BoxSelectBounds {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

@Injectable()
export class RegionSelectService {
	private static _instance: RegionSelectService;
	static get instance(): RegionSelectService { return RegionSelectService._instance; }

	constructor(
		private injector: Injector,
	) {
		RegionSelectService._instance = this;

		runInInjectionContext(injector, () => {
			effect(() => {
				const numTracks = this.tracksService.numTracks();

				
				if (numTracks == 0) {
					this.selectedTrack.set(null);
				} else if (this.selectedTrack() !== null && this.selectedTrack()! >= numTracks) {
					this.selectedTrack.set(numTracks-1);
				}

				this.cleanupSelectedRegions();
			})
		})
	}

	get tracksService() { return TracksService.instance }

	// ========================================================
	// FIELDS

	readonly selectedTrack = signal<number | null>(null);
	public setSelectedTrack(index: number|null) { this.selectedTrack.set(index); }

	readonly selectedRegions = signal<RegionPath[]>([]);
  	readonly hasSelectedRegions = computed(() => this.selectedRegions().length > 0);
  	readonly selectedRegionsCount = computed(() => this.selectedRegions().length);

	readonly tracksWithSelectedRegions = computed(() => {
		const trackIndices = new Set(this.selectedRegions().map(r => r.trackIndex));
		return Array.from(trackIndices).sort();
	});

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	// ========================================================
	// REGION SELECTION

	public setSelectedRegion(trackIndex: number, regionIndex: number | null) {
		if (regionIndex === null) {
			this.selectedRegions.set([]);
			return;
		}

		const newSelection: RegionPath = { trackIndex, regionIndex };
		this.selectedRegions.set([newSelection]);
		this.selectedTrack.set(trackIndex);
	}

	public setSelectedRegions(regions: RegionPath[]) {
		this.selectedRegions.set([...regions]);

		if (regions.length > 0) {
			this.selectedTrack.set(regions[0].trackIndex);
		}
	}

	public selectAllRegions() {
		const regions: RegionPath[] = [];
		const tracks = this.tracksService.tracks();
		
		// Iterate through all tracks and their regions
		tracks.forEach((track, trackIndex) => {
			track.regions().forEach((region, regionIndex) => {
				regions.push({ trackIndex, regionIndex });
			});
		});

		this.selectedRegions.set([...regions]);

		if (regions.length > 0) {
			this.selectedTrack.set(regions[0].trackIndex);
		}
	}

	public addSelectedRegion(regionPath: RegionPath) {
		const alreadySelected = this.isRegionSelected(regionPath);
		
		if (!alreadySelected) {
			const current = this.selectedRegions();
			const updated = [...current, regionPath];
			this.selectedRegions.set(updated);

			if (current.length === 0) {
				this.selectedTrack.set(regionPath.trackIndex);
			}
		}
	}

	public removeSelectedRegion(regionPath: RegionPath) {
		const current = this.selectedRegions();
		const filtered = current.filter(r => 
			!(r.trackIndex === regionPath.trackIndex && r.regionIndex === regionPath.regionIndex)
		);
		this.selectedRegions.set(filtered);

		// Update selected track if needed
		if (filtered.length === 0) {
			this.selectedTrack.set(null);
		} else if (current.length > 0 && current[0].trackIndex === regionPath.trackIndex) {
			this.selectedTrack.set(filtered[0].trackIndex);
		}
	}

	public toggleSelectedRegion(regionPath: RegionPath) {
		const isSelected = this.isRegionSelected(regionPath);
		if (isSelected) {
			this.removeSelectedRegion(regionPath);
		} else {
			this.addSelectedRegion(regionPath);
		}
	}

	public isRegionSelected(regionPath: RegionPath): boolean {
		return this.selectedRegions().some(r => 
			r.trackIndex === regionPath.trackIndex && r.regionIndex === regionPath.regionIndex
		);
	}

	public clearSelection() {
		this.selectedRegions.set([]);
		this.selectedTrack.set(null);
	}

  	// ========================================================
	// BOX SELECTION SYSTEM

	public startBoxSelect(startX: number, startY: number) {
		this.isBoxSelecting.set(true);
		this.boxSelectBounds.set({
			startX,
			startY,
			endX: startX,
			endY: startY
		});
	}

	public updateBoxSelect(endX: number, endY: number) {
		const current = this.boxSelectBounds();
		if (current) {
			this.boxSelectBounds.set({
				...current,
				endX,
				endY
			});
		}
	}

  	public completeBoxSelect(getRegionsInBounds: (bounds: BoxSelectBounds) => RegionPath[]) {
		const bounds = this.boxSelectBounds();
		if (bounds) {
			const regionsInBounds = getRegionsInBounds(bounds);
			this.setSelectedRegions(regionsInBounds);
		}
		
		this.isBoxSelecting.set(false);
		this.boxSelectBounds.set(null);
	}

	public cancelBoxSelect() {
		this.isBoxSelecting.set(false);
		this.boxSelectBounds.set(null);
	}

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

	private cleanupSelectedRegions() {
		const tracks = this.tracksService.tracks();
		const current = this.selectedRegions();
		
		const validSelections = current.filter(selection => {
			const track = tracks[selection.trackIndex];
			return track && selection.regionIndex < track.regions().length;
		});

		if (validSelections.length !== current.length) {
			this.selectedRegions.set(validSelections);

			if (validSelections.length === 0) {
				this.selectedTrack.set(null);
			} else {
				this.selectedTrack.set(validSelections[0].trackIndex);
			}
		}
	}

	// ========================================================
	// UTILITY

	getSelectedRegionsForTrack(trackIndex: number): number[] {
		return this.selectedRegions()
		.filter(r => r.trackIndex === trackIndex)
		.map(r => r.regionIndex);
	}
	hasSelectedRegionsInTrack(trackIndex: number): boolean {
		return this.selectedRegions().some(r => r.trackIndex === trackIndex);
	}

	// color
	selectedTrackBgColor(color: string) { 
		return color.slice(0, 7) + '10';
	}
}
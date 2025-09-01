import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { TracksService } from './tracks.service';
import { StateService } from '../state/state.service';
import { Region } from 'wavesurfer.js/src/plugin/regions';
import { RegionPath, RegionService } from './region.service';

export interface BoxSelectBounds {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

@Injectable()
export class SelectService {
	private static _instance: SelectService;
	static get instance(): SelectService { return SelectService._instance; }

	constructor(
		private injector: Injector,
	) {
		SelectService._instance = this;

		runInInjectionContext(injector, () => {
			effect(() => {
				const regions = this.selectedRegions();
				this.cleanupSelectedRegions();

				this.selectedTrack.set(this.tracksWithSelectedRegions()[this.tracksWithSelectedRegions().length-1])
			})
		})
	}

	get tracksService() { return TracksService.instance }
	get regionService() { return RegionService.instance }
	get tracks() { return this.tracksService.tracks }

	// ========================================================
	// FIELDS

	readonly selectedTrack = signal<string|null>(null);
	public setSelectedTrack(index: string|null) { this.selectedTrack.set(index) }

	readonly selectedRegions = signal<RegionPath[]>([]);
  	readonly hasSelectedRegions = computed(() => this.selectedRegions().length > 0);
  	readonly selectedRegionsCount = computed(() => this.selectedRegions().length);

	readonly leftmostSelectedRegion = computed(() => {
		const selectedRegions = this.selectedRegions().map(path => this.regionService.getRegion(path));
		return selectedRegions.reduce((leftmost, current) => 
			current.start() < leftmost.start() ? current : leftmost
		);
	});
	readonly tracksWithSelectedRegions = computed(() => {
		return Array.from(new Set(this.selectedRegions().map(r => r.trackId))).sort((a,b) => this.tracks.getIndex(a) - this.tracks.getIndex(b));
	});

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	// ========================================================
	// REGION SELECTION

	public setSelectedRegion(trackId: string, regionId: string | null) {
		if (regionId === null) {
			this.selectedRegions.set([]);
			return;
		}

		const newSelection: RegionPath = { trackId, regionId };
		this.selectedRegions.set([newSelection]);
		this.selectedTrack.set(trackId);
	}

	public setSelectedRegions(regions: RegionPath[]) {
		this.selectedRegions.set([...regions]);
	}

	public selectAllRegions() {
		const regions: RegionPath[] = [];
		
		// Iterate through all tracks and their regions
		this.tracks().forEach((track, trackIndex) => {
			track.regions().forEach((region, regionIndex) => {
				regions.push({ trackId: track._id, regionId: region._id });
			});
		});

		this.selectedRegions.set([...regions]);
	}

	public addSelectedRegion(regionPath: RegionPath) {
		const alreadySelected = this.isRegionSelected(regionPath);
		
		if (!alreadySelected) {
			const current = this.selectedRegions();
			const updated = [...current, regionPath];
			this.selectedRegions.set(updated);
		}
		this.selectedTrack.set(regionPath.trackId);
	}

	public removeSelectedRegion(regionPath: RegionPath) {
		const current = this.selectedRegions();
		const filtered = current.filter(r => 
			!(r.trackId === regionPath.trackId && r.regionId === regionPath.regionId)
		);
		this.selectedRegions.set(filtered);

		// Update selected track if needed
		if (filtered.length === 0) {
			this.selectedTrack.set(null);
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
			r.trackId === regionPath.trackId && r.regionId === regionPath.regionId
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

	public shouldNullifyBoxSelect() {
		const bounds = this.boxSelectBounds();
		if (!bounds) {return false}
		const boxWidth = Math.abs(bounds.startX - bounds.endX);
		const boxHeight = Math.abs(bounds.startY - bounds.endY);
		
		const MIN_BOX_SIZE = 5;
		return (boxWidth < MIN_BOX_SIZE && boxHeight < MIN_BOX_SIZE);		
	}

  	public completeBoxSelect(getRegionsInBounds: (bounds: BoxSelectBounds) => RegionPath[]) {
		const bounds = this.boxSelectBounds();
		if (bounds && !this.shouldNullifyBoxSelect()) {
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
		const current = this.selectedRegions();
		
		const validSelections = current.filter(selection => {
			const track = this.tracks.getById(selection.trackId);
			return track && track.regions.getById(selection.regionId);
		});

		if (validSelections.length !== current.length) {
			this.selectedRegions.set(validSelections);

			if (validSelections.length === 0) {
				this.selectedTrack.set(null);
			}
		}
	}

	// ========================================================
	// UTILITY

	getSelectedRegionsForTrack(trackId: string): string[] {
		return this.selectedRegions()
		.filter(r => r.trackId === trackId)
		.map(r => r.regionId);
	}
	hasSelectedRegionsInTrack(trackId: string): boolean {
		return this.selectedRegions().some(r => r.trackId === trackId);
	}

	// color
	selectedTrackBgColor(color: string) { 
		return color.slice(0, 7) + '10';
	}
}
import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { TracksService } from './tracks.service';
import { StateService } from '../state/state.service';
import { RegionService } from './region.service';
import { ObjectStateNode } from '../state/state.factory';
import { Region, Track } from '@shared/types';

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
				const regions = this.selectedRegions();
				this.cleanupSelectedRegions();
				if (this.selectedRegions().length > 0) this.selectedTrack.set(this.tracksWithSelectedRegions()[this.tracksWithSelectedRegions().length-1])
			})
		})
	}

	get tracksService() { return TracksService.instance }
	get regionService() { return RegionService.instance }
	get tracks() { return this.tracksService.tracks }

	// ========================================================
	// FIELDS

	readonly selectedTrack = signal<ObjectStateNode<Track>|null>(null);
	public setSelectedTrack(track: ObjectStateNode<Track>) { this.selectedTrack.set(track) }

	readonly selectedRegions = signal<ObjectStateNode<Region>[]>([]);
  	readonly hasSelectedRegions = computed(() => this.selectedRegions().length > 0);
  	readonly selectedRegionsCount = computed(() => this.selectedRegions().length);

	readonly leftmostSelectedRegion = computed(() => {
		return this.selectedRegions().reduce((leftmost, current) => 
			current.start() < leftmost.start() ? current : leftmost
		);
	});
	readonly tracksWithSelectedRegions = computed(() => {
		return Array.from( new Set(this.selectedRegions().map(r => r.gp() as ObjectStateNode<Track>)) ).sort((a,b) => this.tracks.getIndex(a._id) - this.tracks.getIndex(b._id));
	});

	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	// ========================================================
	// REGION SELECTION

	public setSelectedRegion(region: ObjectStateNode<Region> | null) {
		if (region === null) {
			this.selectedRegions.set([]);
			return;
		}
		this.selectedRegions.set([region]);
		this.selectedTrack.set(region.gp());
	}

	public setSelectedRegions(regions: ObjectStateNode<Region>[]) {
		this.selectedRegions.set([...regions]);
	}

	public selectAllRegions() {
		const regions: ObjectStateNode<Region>[] = [];
		
		this.tracks().forEach(track => {
			track.regions().forEach(region => {
				regions.push(region)
			});
		});

		this.selectedRegions.set([...regions]);
	}

	public addSelectedRegion(region: ObjectStateNode<Region>) {
		const alreadySelected = this.isRegionSelected(region);
		
		if (!alreadySelected) {
			const current = this.selectedRegions();
			const updated = [...current, region];
			this.selectedRegions.set(updated);
		}
		this.selectedTrack.set(region.gp() as ObjectStateNode<Track>);
	}

	public removeSelectedRegion(region: ObjectStateNode<Region>) {
		const current = this.selectedRegions();
		const filtered = current.filter(r => !this.isRegionSelected(region));
		this.selectedRegions.set(filtered);

		if (filtered.length === 0) {
			this.selectedTrack.set(null);
		}
	}

	public toggleSelectedRegion(region: ObjectStateNode<Region>) {
		const isSelected = this.isRegionSelected(region);
		if (isSelected) {
			this.removeSelectedRegion(region);
		} else {
			this.addSelectedRegion(region);
		}
	}

	public isRegionSelected(region: ObjectStateNode<Region>): boolean {
		return this.selectedRegions().some(r => (r._id === region._id));
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

  	public completeBoxSelect(getRegionsInBounds: (bounds: BoxSelectBounds) => ObjectStateNode<Region>[]) {
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
		
		const validSelections = current.filter(region => {
			const track = region.gp() as ObjectStateNode<Track>;
			return track && track.regions.getById(region._id);
		});

		if (validSelections.length !== current.length) {
			this.selectedRegions.set(validSelections);

			/*
			if (validSelections.length === 0) {
				this.selectedTrack.set(null);
			}*/
		}
	}

	// ========================================================
	// UTILITY

	selectedTrackBgColor(color: string) { 
		return color.slice(0, 7) + '10';
	}
}
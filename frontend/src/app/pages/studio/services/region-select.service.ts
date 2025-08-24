import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ProjectState } from './project-state.service';
import { ProjectStateTracks } from './substates';
import { ViewportService } from './viewport.service';

export interface SelectedRegion {
	trackIndex: number;
	regionIndex: number;
}

export interface BoxSelectBounds {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
}

@Injectable()
export class RegionSelectService {
	declare tracksState: ProjectStateTracks;

	readonly selectedTrack = signal<number | null>(null);
	public setSelectedTrack(index: number|null) { this.selectedTrack.set(index); }

	readonly selectedRegions = signal<SelectedRegion[]>([]);
  	readonly hasSelectedRegions = computed(() => this.selectedRegions().length > 0);
  	readonly selectedRegionsCount = computed(() => this.selectedRegions().length);

	readonly tracksWithSelectedRegions = computed(() => {
		const trackIndices = new Set(this.selectedRegions().map(r => r.trackIndex));
		return Array.from(trackIndices).sort();
	});

	// Box selection state
	readonly isBoxSelecting = signal<boolean>(false);
  	readonly boxSelectBounds = signal<BoxSelectBounds | null>(null);

	constructor(
		private injector: Injector,
		private projectState: ProjectState,
		private viewportService: ViewportService,
	) {
		this.tracksState = projectState.tracksState;

		runInInjectionContext(injector, () => {
			effect(() => {
				const numTracks = this.tracksState.numTracks();

				if (numTracks == 0) {
					this.selectedTrack.set(null);
				} else if (this.selectedTrack() !== null && this.selectedTrack()! >= numTracks) {
					this.selectedTrack.set(numTracks-1);
				}

				this.cleanupSelectedRegions();
			})
		})
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// REGION SELECTION
	///////////////////////////////////////////////////////////////////////////////////////////////////////

	public setSelectedRegion(trackIndex: number, regionIndex: number | null) {
		if (regionIndex === null) {
			this.selectedRegions.set([]);
			return;
		}

		const newSelection: SelectedRegion = { trackIndex, regionIndex };
		this.selectedRegions.set([newSelection]);
		this.selectedTrack.set(trackIndex);
	}

	public setSelectedRegions(regions: SelectedRegion[]) {
		this.selectedRegions.set([...regions]);

		if (regions.length > 0) {
			this.selectedTrack.set(regions[0].trackIndex);
		}
	}

	public selectAllRegions() {
		const regions: SelectedRegion[] = [];
		const tracks = this.tracksState.tracks();
		
		// Iterate through all tracks and their regions
		tracks.forEach((track, trackIndex) => {
			track.regions.forEach((region, regionIndex) => {
				regions.push({ trackIndex, regionIndex });
			});
		});

		this.selectedRegions.set([...regions]);

		if (regions.length > 0) {
			this.selectedTrack.set(regions[0].trackIndex);
		}
	}


	public addSelectedRegion(trackIndex: number, regionIndex: number) {
		const newRegion: SelectedRegion = { trackIndex, regionIndex };
		const current = this.selectedRegions();
		
		const alreadySelected = current.some(r => 
			r.trackIndex === trackIndex && r.regionIndex === regionIndex
		);
		
		if (!alreadySelected) {
			const updated = [...current, newRegion];
			this.selectedRegions.set(updated);

			if (current.length === 0) {
				this.selectedTrack.set(trackIndex);
			}
		}
	}

	public removeSelectedRegion(trackIndex: number, regionIndex: number) {
		const current = this.selectedRegions();
		const filtered = current.filter(r => 
			!(r.trackIndex === trackIndex && r.regionIndex === regionIndex)
		);
		this.selectedRegions.set(filtered);

		// Update selected track if needed
		if (filtered.length === 0) {
			this.selectedTrack.set(null);
		} else if (current.length > 0 && current[0].trackIndex === trackIndex) {
			this.selectedTrack.set(filtered[0].trackIndex);
		}
	}

	public toggleSelectedRegion(trackIndex: number, regionIndex: number) {
		const isSelected = this.isRegionSelected(trackIndex, regionIndex);
		if (isSelected) {
			this.removeSelectedRegion(trackIndex, regionIndex);
		} else {
			this.addSelectedRegion(trackIndex, regionIndex);
		}
	}

	public isRegionSelected(trackIndex: number, regionIndex: number): boolean {
		return this.selectedRegions().some(r => 
			r.trackIndex === trackIndex && r.regionIndex === regionIndex
		);
	}

	public clearSelection() {
		this.selectedRegions.set([]);
		this.selectedTrack.set(null);
	}

  	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// BOX SELECTION SYSTEM
	///////////////////////////////////////////////////////////////////////////////////////////////////////

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

  	public completeBoxSelect(getRegionsInBounds: (bounds: BoxSelectBounds) => SelectedRegion[]) {
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
		const tracks = this.tracksState.tracks();
		const current = this.selectedRegions();
		
		const validSelections = current.filter(selection => {
			const track = tracks[selection.trackIndex];
			return track && selection.regionIndex < track.regions.length;
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

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// UTILITY
	///////////////////////////////////////////////////////////////////////////////////////////////////////

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
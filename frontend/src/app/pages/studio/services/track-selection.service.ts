import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ProjectState } from './project-state.service';
import { ProjectStateTracks } from './substates';

@Injectable()
export class TrackSelectionService {
	declare tracksState: ProjectStateTracks;

	readonly selectedTrack = signal<number | null>(null);
	public setSelectedTrack(index: number|null) { this.selectedTrack.set(index) }

	constructor(
		private injector: Injector,
		private projectState: ProjectState,
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
			})
		})
	}

	selectedBgColor(color: string) {
		return color.slice(0, 7) + '10'
	}
}
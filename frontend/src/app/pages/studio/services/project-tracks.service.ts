import { Injectable, signal,WritableSignal, computed } from '@angular/core';
import { ProjectTracks } from '@shared/types/ProjectStudio';

import { Track } from '@shared/types/ProjectStudio'

@Injectable({ providedIn: 'root' })
export class ProjectTracksService {
	private readonly _trackSignals = signal<WritableSignal<Track>[]>([]);
	get trackSignals(): WritableSignal<Track>[] { return this._trackSignals(); }

	readonly state = computed<ProjectTracks>(() => ({
		tracks: this._trackSignals().map(sig => sig())
	}));

	init(projectTracks: ProjectTracks) {
		const signals = projectTracks.tracks.map(track => signal(track));
		this._trackSignals.set(signals);
	}

	updateTrack(index: number, partial: Partial<Track>) {
		const signals = this._trackSignals();
		if (index < 0 || index >= signals.length) return;

		const current = signals[index]();
		signals[index].set({ ...current, ...partial });
	}

	addTrack(track: Track) {
		const signals = this._trackSignals();
		this._trackSignals.set([...signals, signal(track)]);
	}

	removeTrack(index: number) {
		const signals = this._trackSignals();
		if (index < 0 || index >= signals.length) return;

		const updated = [...signals];
		updated.splice(index, 1);
		this._trackSignals.set(updated);
	}

}
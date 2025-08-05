import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { ProjectStudio } from '@shared_types/ProjectStudio'
import { DefaultKey } from '@shared/types/Key';
import { DefaultTimeSignature } from '@shared/types/TimeSignature';

export function createDefaultProjectStudio() : ProjectStudio {
	return {
		metadata: {
			_id: "placeholder",
			title: "Untitled",
			authorIds: [],
			authors: [],
			createdAt: new Date(),
			updatedAt: new Date(),

			isCollaboration: false,
			isRemix: false,
			isRemixOf: null,

			isReleased: false,
		},
		vars: {
			bpm: 120,
			key: DefaultKey,
			centOffset: 0,
			timeSignature:DefaultTimeSignature,
			masterVolume: 1
		},
		tracks: {
			tracks: []
		}
	}
}

@Injectable()
export class ProjectService {
	private readonly _state$ = new BehaviorSubject<ProjectStudio | null>(null);

	get state$() { return this._state$.asObservable(); }
	get snapshot(): ProjectStudio { return this._state$.getValue()!; }

	update(partial: Partial<ProjectStudio>) {
		this._state$.next({
		...this.snapshot,
		...partial
		});
	}

	init(project?: ProjectStudio) {
		if (project) this._state$.next(project);
		else this._state$.next(createDefaultProjectStudio());
	}
}
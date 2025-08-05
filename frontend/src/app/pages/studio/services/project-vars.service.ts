import { Injectable, signal, computed } from '@angular/core';
import { ProjectVars } from '@shared/types/ProjectStudio';

import { DefaultKey } from '@shared/types/Key';
import { DefaultTimeSignature } from '@shared/types/TimeSignature';

@Injectable({ providedIn: 'root' })
export class ProjectVarsService {
	readonly bpm = signal(120);
	readonly key = signal(DefaultKey);
	readonly centOffset = signal(0);
	readonly timeSignature = signal(DefaultTimeSignature);
	readonly masterVolume = signal(100);

	readonly state = computed<ProjectVars>(() => ({
		bpm: this.bpm(),
		key: this.key(),
		centOffset: this.centOffset(),
		timeSignature: this.timeSignature(),
		masterVolume: this.masterVolume(),
	}));

	init(vars: ProjectVars) {
		this.bpm.set(vars.bpm);
		this.key.set(vars.key);
		this.centOffset.set(vars.centOffset);
		this.timeSignature.set(vars.timeSignature);
		this.masterVolume.set(vars.masterVolume);
	}

	update(partial: Partial<ProjectVars>) {
		if (partial.bpm !== undefined) this.bpm.set(partial.bpm);
		if (partial.key !== undefined) this.key.set(partial.key);
		if (partial.centOffset !== undefined) this.centOffset.set(partial.centOffset);
		if (partial.timeSignature !== undefined) this.timeSignature.set(partial.timeSignature);
		if (partial.masterVolume !== undefined) this.masterVolume.set(partial.masterVolume);
	}
}
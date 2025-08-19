import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { ProjectState } from './project-state.service';
import { ProjectStateGlobals } from './substates';

@Injectable()
export class ViewportService {
	declare globalsState: ProjectStateGlobals;

	constructor(
		private injector: Injector,
		private projectState: ProjectState,
	) {
		this.globalsState = projectState.globalsState;
	}

	
}
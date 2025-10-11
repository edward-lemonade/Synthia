import { Injectable, signal, computed, effect } from '@angular/core';
import { RpMasterLayer } from '@shared/types';
import { StateService } from '../state/state.service';


@Injectable()
export class AudioPipelineService {
	private static _instance: AudioPipelineService;
	static get instance(): AudioPipelineService { return AudioPipelineService._instance; }

	public declare static pipeline: RpMasterLayer; 
	public declare static audioCtx: AudioContext;

	get pipeline() { return AudioPipelineService.pipeline; }

	constructor() {
		AudioPipelineService._instance = this;

		AudioPipelineService.pipeline = {
			nodes: [],
			children: [],
		}

		
	}

}
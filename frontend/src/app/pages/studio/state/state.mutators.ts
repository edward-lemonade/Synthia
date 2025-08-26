
import { AudioRegion, ProjectState, RegionType, TimeSignature, timeSignatureEquals, Track } from "@shared/types";
import { StateService } from "./state.service";
import { Primitive, StateHelpers, StateNode, WritableStateSignal } from "./state.factory";
import { produceWithPatches } from "immer";

import { ViewportService } from "../services/viewport.service";
import { HistoryService } from "../services/history.service";

export type SignalMutator<T, U> = (
    internalFn: () => void, 
    currentValue: T, 
    newValue: T, 
    stateNode: StateNode<U>
) => void;



// ==============================================================
// Top Level

export const studio_bpm_mutator: SignalMutator<number, number> = (
	internalFn: () => void,
	currentValue: number,
	newValue: number,
	stateNode: StateNode<number>
) => {
	const currentState = StateService.instance.state.snapshot() as ProjectState;

	console.log("custom bpm mutator")
	// Internal
	internalFn();
	StateService.instance.state.studio.tracks().forEach(track => {
		track.regions().forEach(region => {
			if (region.type() == RegionType.Audio) {
				region = region as StateNode<AudioRegion>;
				region.duration.setSilent(ViewportService.instance.timeToPos(region.audioEndOffset()-region.audioStartOffset()));
			}
		})
	});
	
	// Patch
	if (stateNode.allowsUndoRedo()) {
		const [_, patches, inversePatches] = produceWithPatches(currentState, (draft: ProjectState) => {
			draft.studio.bpm = newValue;

			draft.studio.tracks.forEach(track => {
				track.regions.forEach(region => {
					if (region.type == RegionType.Audio) {
						const newDuration = ViewportService.instance.timeToPos(region.audioEndOffset-region.audioStartOffset);
						region.duration = newDuration;
					}
				})
			});
		});
		if (patches && patches.length > 0) { HistoryService.instance.recordPatch(patches, inversePatches); }
	}
}
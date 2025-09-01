import { v4 as uuid } from "uuid";
import { ArrayStateNode, ObjectStateNode, PropStateNode } from "./state.factory";
import { HistoryService } from "../services/history.service";
import { AudioRegion, Author, BaseFileRef, Key, Region, RegionType, TimeSignature, Track, TrackType } from "@shared/types";
import { StateService } from "./state.service";
import { RegionService } from "../services/region.service";

export type Mutator<T> = ( 
	newValue: T, 
	stateNode: PropStateNode<T>,
	actionId: string,
) => void;

export type ArrayMutator<T extends Record<string, any>> = ( 
	newValue: ObjectStateNode<T>[], 
	stateNode: ArrayStateNode<T>,
	actionId: string,
) => void;

// ==============================================================
// Mutators
// ==============================================================

// Metadata

export const setProjectId: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) => // disallow 
	{ }
export const setTitle: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) =>  // unrecorded change
	{ node._set(val) }
export const setAuthors: Mutator<Author[]> = (val: Author[], node: PropStateNode<Author[]>, actionId) =>  // disallow 
	{ }
export const setCreatedAt: Mutator<Date> = (val: Date, node: PropStateNode<Date>, actionId) =>  // disallow
	{ }
export const setUpdatedAt: Mutator<Date> = (val: Date, node: PropStateNode<Date>, actionId) =>  // disallow
	{ }
export const setIsCollaboration: Mutator<boolean> = (val: boolean, node: PropStateNode<boolean>, actionId) =>  // disallow
	{ }
export const setIsRemix: Mutator<boolean> = (val: boolean, node: PropStateNode<boolean>, actionId) =>  // disallow
	{ }
export const setIsRemixOf: Mutator<null | string> = (val: null | string, node: PropStateNode<null | string>, actionId) =>  // disallow
	{ }
export const setIsReleased: Mutator<boolean> = (val: boolean, node: PropStateNode<boolean>, actionId) =>  // disallow
	{ }

// Studio

export const setBpm: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => { // simple change
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);

	RegionService.instance.getAllRegions().forEach((regionNode) => {
		(regionNode.duration as PropStateNode<number>).update(og => og / initial * val, actionId);
	})
}
export const setKey: Mutator<Key> = (val: Key, node: PropStateNode<Key>, actionId) => { // simple change 
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}
export const setCentOffset: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => { // simple change 
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}
export const setTimeSignature: Mutator<TimeSignature> = (val: TimeSignature, node: PropStateNode<TimeSignature>, actionId) => { // simple change 
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}
export const setMasterVolume: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => { // simple change 
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}
export const setFileRefs: Mutator<BaseFileRef[]> = (val: BaseFileRef[], node: PropStateNode<BaseFileRef[]>, actionId) => { // simple change 
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}
export const setTracks: ArrayMutator<Track> = (val: ObjectStateNode<Track>[], node: ArrayStateNode<Track>, actionId) => { // simple change 
	const initial = node.getAll();
	const forward = () => { 
		node._ids.set(val.map(el => el._id));
		val.forEach((el) => { node._items.set(el._id, el); });
	}
	const reverse = () => { 
		node._ids.set(initial.map(el => el._id));
		initial.forEach((el) => { node._items.set(el._id, el); });
	}
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse) 
}

// Track

export const setTrackIndex: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackName: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackColor: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackType: Mutator<TrackType> = (val: TrackType, node: PropStateNode<TrackType>, actionId) => 
	{}
export const setTrackRegionType: Mutator<RegionType> = (val: RegionType, node: PropStateNode<RegionType>, actionId) => 
	{}
export const setTrackInstrument: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackVolume: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackPan: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackMute: Mutator<boolean> = (val: boolean, node: PropStateNode<boolean>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackSolo: Mutator<boolean> = (val: boolean, node: PropStateNode<boolean>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackEffects: Mutator<any[]> = (val: any[], node: PropStateNode<any[]>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setTrackRegions: ArrayMutator<Region> = (val: any[], node: ArrayStateNode<Region>, actionId) => {
	const initial = node.getAll();
	const forward = () => { 
		node._ids.set(val.map(el => el._id));
		val.forEach((el) => { node._items.set(el._id, el); });
	}
	const reverse = () => { 
		node._ids.set(initial.map(el => el._id));
		initial.forEach((el) => { node._items.set(el._id, el); });
	}
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse)
}

// ==============================================================
// Region Mutators
// ==============================================================

export const setRegionTrackIndex: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionFileId: Mutator<string> = (val: string, node: PropStateNode<string>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionStart: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();

	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }

	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionDuration: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionType: Mutator<RegionType> = (val: RegionType, node: PropStateNode<RegionType>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}

// Audio Region specific mutators
export const setRegionFullStart: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const diff = val - initial;
	const regionNode = node._parent! as unknown as ObjectStateNode<AudioRegion>;

	const initialStart = regionNode.start();
	const newStart = initialStart + diff;

	const forward = () => { 
		node._set(val); 
		regionNode.start.set(newStart);
	}
	const reverse = () => { 
		node._set(initial); 
		regionNode.start.set(initialStart);
	}
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionFullDuration: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionAudioStartOffset: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionAudioEndOffset: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionVolume: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionPitch: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionTimeStretch: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionFadeIn: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}
export const setRegionFadeOut: Mutator<number> = (val: number, node: PropStateNode<number>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}

// MIDI Region specific mutators
export const setMidiData: Mutator<any[]> = (val: any[], node: PropStateNode<any[]>, actionId) => {
	const initial = node();
	const forward = () => { node._set(val); }
	const reverse = () => { node._set(initial); }
	forward();
	HistoryService.instance.recordCommand(actionId, forward, reverse);
}

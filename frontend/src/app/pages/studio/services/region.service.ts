import { Injectable, Injector } from "@angular/core";
import { StateService } from "../state/state.service";
import { TracksService } from "./tracks.service";
import { ArrayStateNode, ObjectStateNode } from "../state/state.factory";
import { AudioRegion, MidiRegion, Region, RegionType, Track } from "@shared/types";
import { v4 as uuid } from "uuid";
import { ViewportService } from "./viewport.service";
import { SelectService } from "./select.service";

export interface RegionPath {
	trackId: string;
	regionId: string;
}

@Injectable()
export class RegionService {
	private static _instance: RegionService;
	static get instance(): RegionService { return RegionService._instance; }

	constructor(
		private injector: Injector,
	) {
		RegionService._instance = this;
	}

	get stateService() { return StateService.instance }
	get tracksService() { return TracksService.instance }
	
	get tracks() { return this.stateService.state.studio.tracks; }

	// ========================================================
	// Region Operations

	getRegions(trackId: string): ArrayStateNode<Region> {
		return this.tracks.getById(trackId)!.regions;
	}
	getRegion(path: RegionPath): ObjectStateNode<Region> {
		return this.getRegions(path.trackId).getById(path.regionId)!;
	}
	addAudioRegion(trackNode: ObjectStateNode<Track>, overrides: Partial<AudioRegion> = {}) {
		const props: Partial<AudioRegion> = {
			...overrides,
			type: RegionType.Audio, 
		}
		trackNode.regions.insertValue(props);
	}
	addMidiRegion(trackNode: ObjectStateNode<Track>, overrides: Partial<MidiRegion> = {}) {
		const props: Partial<MidiRegion> = {
			...overrides,
			type: RegionType.Midi, 
		}
		trackNode.regions.insertValue(props);
	}
	deleteRegion(path: RegionPath) {
		SelectService.instance.removeSelectedRegion(path);
		this.tracks.getById(path.trackId)?.regions.remove(path.regionId);
	}
	deleteRegions(paths: RegionPath[]) {
		for (const p of paths) { this.deleteRegion(p); }
	}
	transferRegionToTrack(path: RegionPath, newTrackIndex: number, actionId = uuid()) {
		const sourceTrack = this.tracks.getById(path.trackId)!;
		const targetTrack = this.tracks.get(newTrackIndex)!;
		
		const region = sourceTrack.regions.remove(path.regionId, actionId);
		targetTrack.regions.push(region, actionId);
	}
	transferRegionsToTrack(paths: RegionPath[], trackIndexOffset: number, actionId = uuid()) {
		paths.forEach(path => {
			const trackIndex = this.tracks.getIndex(path.trackId);
			this.transferRegionToTrack(path, trackIndex + trackIndexOffset, actionId);
		});
	}
	moveRegion(path: RegionPath, newStart: number, actionId = uuid()) {
		const regionNode = this.getRegion(path);

		if (regionNode.type() == RegionType.Audio) {
			const audioRegionNode = regionNode as ObjectStateNode<AudioRegion>;

			const oldFullStart = audioRegionNode.fullStart();
			const newFullStart = oldFullStart + (newStart - audioRegionNode.start());
	
			audioRegionNode.fullStart.set(newFullStart, actionId);
		} else {
			regionNode.start.set(newStart, actionId);
		}
	}
	moveRegions(paths: RegionPath[], startOffset: number, actionId = uuid()) {
		paths.forEach(path => {
			const region = this.getRegion(path);
			this.moveRegion(path, region.start() + startOffset, actionId);
		});
	}
	resizeRegion(path: RegionPath, newStart: number, newDuration: number, actionId = uuid()) {
		const regionNode = this.getRegion(path);

		if (regionNode.type() == RegionType.Audio) {
			const audioRegionNode = regionNode as ObjectStateNode<AudioRegion>;
			
			audioRegionNode.audioStartOffset.set(ViewportService.instance.posToTime(newStart - audioRegionNode.fullStart()));
			audioRegionNode.audioEndOffset.set(ViewportService.instance.posToTime(newStart + newDuration));

			audioRegionNode.start.set(newStart, actionId);
			audioRegionNode.duration.set(newDuration, actionId);
		} else {
			regionNode.start.set(newStart, actionId);
			regionNode.duration.set(newDuration, actionId);
		}
	}
	duplicateRegion(path: RegionPath) {
		const duped = { ...this.getRegion(path).snapshot() };
		this.getRegions(path.trackId).insertValue(duped);
	}
	getParentTrack(regionId: string): number {
		for (let index = 0; index < this.tracks._ids().length; index++) {
			const track = this.tracks.get(index);
			if (track?.regions._ids().includes(regionId)) {
				return index;
			}
		}
		return -1; // Return -1 if not found
	}
}
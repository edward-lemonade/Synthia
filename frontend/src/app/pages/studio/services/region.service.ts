import { Injectable, Injector } from "@angular/core";
import { StateService } from "../state/state.service";
import { TracksService } from "./tracks.service";
import { ArrayStateNode, ObjectStateNode } from "../state/state.factory";
import { AudioRegion, MidiRegion, Region, RegionType, Track } from "@shared/types";
import { v4 as uuid } from "uuid";
import { ViewportService } from "./viewport.service";
import { RegionSelectService } from "./region-select.service";

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

	getAllRegions(snapshot: boolean = false): Region[] | ObjectStateNode<Region>[] {
		if (snapshot) {
			return this.tracks().flatMap(track => track.regions.snapshot());
		} else {
			return this.tracks().flatMap(track => track.regions());
		}
	}
	getRegions(trackId: string): ArrayStateNode<Region> {
		return this.tracks.getById(trackId)!.regions;
	}
	getRegion(trackId: string, regionId: string): ObjectStateNode<Region> {
		return this.getRegions(trackId).getById(regionId)!;
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
	deleteRegion(region: ObjectStateNode<Region>) {
		RegionSelectService.instance.removeSelectedRegion(region);
		region._parent.remove(region._id);
	}
	deleteRegions(regions: ObjectStateNode<Region>[]) {
		for (const r of regions) { this.deleteRegion(r); }
	}
	transferRegionToTrack(region: ObjectStateNode<Region>, newTrackIndex: number, actionId = uuid()) {
		const targetTrack = this.tracks.get(newTrackIndex)!;
		
		region._parent.remove(region._id, actionId);
		targetTrack.regions.push(region, actionId);
	}
	transferRegionsToTrack(regions: ObjectStateNode<Region>[], trackIndexOffset: number, actionId = uuid()) {
		regions.forEach(region => {
			const trackIndex = this.tracks.getIndex(region.gp().trackId);
			this.transferRegionToTrack(region, trackIndex + trackIndexOffset, actionId);
		});
	}
	moveRegion(region: ObjectStateNode<Region>, newStart: number, actionId = uuid()) {
		if (region.type() == RegionType.Audio) {
			const audioRegion = region as ObjectStateNode<AudioRegion>;

			const oldFullStart = audioRegion.fullStart();
			const newFullStart = oldFullStart + (newStart - audioRegion.start());
	
			audioRegion.fullStart.set(newFullStart, actionId);
		} else {
			region.start.set(newStart, actionId);
		}
	}
	moveRegions(regions: ObjectStateNode<Region>[], startOffset: number, actionId = uuid()) {
		regions.forEach(region => {
			this.moveRegion(region, region.start() + startOffset, actionId);
		});
	}
	resizeRegion(region: ObjectStateNode<Region>, newStart: number, newDuration: number, actionId = uuid()) {
		if (region.type() == RegionType.Audio) {
			const audioRegion = region as ObjectStateNode<AudioRegion>;
			
			audioRegion.audioStartOffset.set(ViewportService.instance.posToTime(newStart - audioRegion.fullStart()));
			audioRegion.audioEndOffset.set(ViewportService.instance.posToTime(newStart + newDuration));

			audioRegion.start.set(newStart, actionId);
			audioRegion.duration.set(newDuration, actionId);
		} else {
			region.start.set(newStart, actionId);
			region.duration.set(newDuration, actionId);
		}
	}
	duplicateRegion(region: ObjectStateNode<Region>) {
		const duped = { ...region.snapshot() };
		region._parent.insertValue(duped);
	}
}
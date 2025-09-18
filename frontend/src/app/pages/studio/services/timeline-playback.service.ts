import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { StateService } from '../state/state.service';
import { ViewportService } from './viewport.service';
import { AudioCacheService } from './audio-cache.service';
import { AudioRegion, MidiNote, MidiRegion, MidiTrackType, Region, RegionType, Track } from '@shared/types';
import { RegionService } from './region.service';
import { TracksService } from './tracks.service';
import { ObjectStateNode } from '../state/state.factory';
import { PlaybackMarkerComponent } from '../components/studio-editor/viewport-overlay/playback-marker/playback-marker.component';
import { ReverbProcessor } from '@shared/audio-processing/synthesis/effects/reverb-handler';
import { AudioRecording, AudioRecordingService } from './audio-recording.service';
import { MidiSource, SynthesizerService } from './synthesizer.service';
import { InstantSynthesizerService } from './instant-synthesizer.service';

export interface TrackNodes {
	gainNode: GainNode,
	pannerNode: StereoPannerNode,
	reverbMixNode: {
		input: GainNode;
		dryGain: GainNode;
		wetGain: GainNode;
		output: GainNode;
		convolver: ConvolverNode | null;
	} | null,
	trackId: string,
}

export interface MidiSourceInfo {
	source: MidiSource;
	region: ObjectStateNode<MidiRegion>;
}


@Injectable()
export class TimelinePlaybackService { // SINGLETON
	private static _instance: TimelinePlaybackService;
	static get instance(): TimelinePlaybackService { return TimelinePlaybackService._instance; }

	constructor(
		private injector: Injector,
		private synthesizerService: SynthesizerService,
		private instantSynthesizerService: InstantSynthesizerService,
	) {
		TimelinePlaybackService._instance = this;
		this.audioContext = new AudioContext();

		this.masterGainNode = this.audioContext.createGain();
		this.masterGainNode.connect(this.audioContext.destination);

		this.synthesizerService.initializeAudioContext(this.audioContext);
		this.instantSynthesizerService.initializeAudioContext(this.audioContext);
		this.reverbProcessor = new ReverbProcessor();
	}

	get viewportService() { return ViewportService.instance }
	get audioCache() { return AudioCacheService.instance }
	get tracks() { return TracksService.instance.tracks }
	get regions() { return RegionService.instance.getAllRegions(true) }

	// ==============================================================================================
	// Fields

	audioContext: AudioContext;
	declare reverbProcessor: ReverbProcessor;
	private masterGainNode: GainNode;
	private activeAudioSources: AudioBufferSourceNode[] = [];
	private activeMidiSources: MidiSourceInfo[] = [];
	private trackNodes = new Map<string, TrackNodes>();

	playbackPos = signal(0);
	playbackTime = computed(() => ViewportService.instance.posToTime(this.playbackPos()));
	playbackPx = computed(() => ViewportService.instance.posToPx(this.playbackPos()));
	basePos = signal(0);
	deltaPos = signal(0);
	playbackTimeDisplay = computed(() => this.playbackTime() + ViewportService.instance.posToTime(this.deltaPos()))

	setPlaybackPos(pos: number, dontSnap = false, viewportService: ViewportService = ViewportService.instance) { 
		const wasPlaying = this.isPlaying();

		if (wasPlaying) this.pause();

		let finalPos = dontSnap ? pos : (viewportService.snapToGrid() ? viewportService.snap(pos) : pos);
		finalPos = Math.max(0, finalPos);
		this.playbackPos.set(finalPos); 

		if (wasPlaying) this.play();
	}
	setPlaybackTime(time: number, dontSnap = false, viewportService: ViewportService = ViewportService.instance) { this.setPlaybackPos(viewportService.timeToPos(time), dontSnap, viewportService); }
	setPlaybackPx(px: number, dontSnap = false, viewportService: ViewportService = ViewportService.instance) { this.setPlaybackPos(viewportService.pxToPos(px, false), dontSnap, viewportService); }

	localizePlaybackPx(px: number, viewportService: ViewportService) {
		const pos = ViewportService.instance.pxToPos(px);
		return viewportService.posToPx(pos);
	}

	isPlaying = signal(false);

	playbackLineRef?: WeakRef<PlaybackMarkerComponent>;
	playbackLineMidiEditorRef?: WeakRef<PlaybackMarkerComponent>;
	registerPlaybackLine(comp: PlaybackMarkerComponent) { this.playbackLineRef = new WeakRef(comp) }
	registerPlaybackLineMidiEditor(comp: PlaybackMarkerComponent) { this.playbackLineMidiEditorRef = new WeakRef(comp) }

	private startClockTime = 0;
	private startContextTime = 0;

	// ==============================================================================================
	// Control

	async play() {
		//if (this.isPlaying()) return;
		this.isPlaying.set(true);
		this.startPlaybackLineAnim();
		this.startPlayback();
	}

	async pause() {
		//if (!this.isPlaying()) return;
		this.isPlaying.set(false);
		this.stopPlaybackLineAnim();
		this.stopPlayback();
	}

	async toggleRecording(): Promise<AudioRecording | void> {
		if (AudioRecordingService.instance.isRecording()) {
			this.pause();
			this.setPlaybackPos(this.basePos());
			return await AudioRecordingService.instance.stopRecording();
		} else {
			this.play();
			await AudioRecordingService.instance.startRecording();
			return; 
		}
	}

	moveForward() {
		this.setPlaybackPos(this.playbackPos() + 2*this.viewportService.smallestUnit());
	}
	moveBackward() {
		this.setPlaybackPos(this.playbackPos() - 2*this.viewportService.smallestUnit());
	}
	moveBeginning() {
		this.setPlaybackPos(0);
		this.viewportService.setWindowPosX(0);
	}

	// ==============================================================================================
	// Line Anim

	private async startPlaybackLineAnim() {
		if (!this.playbackLineRef) return;

		this.startClockTime = performance.now();
		this.basePos.set(this.playbackPos());
		this.deltaPos.set(0);

		const playbackLine = this.playbackLineRef?.deref(); 
		const playbackLineMidiEditor = this.playbackLineMidiEditorRef?.deref(); 

		const step = (now: number) => {
			if (!this.isPlaying()) return;

			const elapsedSec = (now - this.startClockTime) / 1000;
			const deltaPos = this.viewportService.timeToPos(elapsedSec);

			this.deltaPos.set(deltaPos);

			if (playbackLine) {playbackLine.updateTransform(deltaPos)};
			if (playbackLineMidiEditor) {playbackLineMidiEditor.updateTransform(deltaPos)};

			requestAnimationFrame(step);
		};

		requestAnimationFrame(step);
	}

	private async stopPlaybackLineAnim() {
		const now = performance.now();

		const elapsedSec = (now - this.startClockTime) / 1000;
		const deltaPos = this.viewportService.timeToPos(elapsedSec);

		this.deltaPos.set(0);
		this.setPlaybackPos(this.basePos() + deltaPos, true);

		const playbackLine = this.playbackLineRef?.deref(); 
		const playbackLineMidiEditor = this.playbackLineMidiEditorRef?.deref(); 
		if (playbackLine) {playbackLine.updateTransform(0)};
		if (playbackLineMidiEditor) {playbackLineMidiEditor.updateTransform(0)};
	}

	// ==============================================================================================
	// Playback

	private async startPlayback() {
		const playbackTime = this.playbackTime();
		
		//this.trackNodes.clear();
		this.activeAudioSources = [];
		this.activeMidiSources = [];
		this.synthesizerService.stopAllNotes();

		this.startContextTime = this.audioContext.currentTime;

		this.tracks().forEach(track => { // gain -> reverb -> panner -> master
			const trackId = track._id;
			const nodes = this.checkAndUpdateTrackNodes(trackId)!;

			// Process all regions for track
			track.regions().forEach(region => {
				if (region.type() === RegionType.Audio) {
					this.startAudioRegion(
						region as ObjectStateNode<AudioRegion>, 
						nodes.gainNode, 
						playbackTime
					);
				} else if (region.type() === RegionType.Midi) {
					this.startMidiRegion(
						region as ObjectStateNode<MidiRegion>, 
						nodes.gainNode, 
						playbackTime,
						trackId
					);
				}
			});
		});

		await this.audioContext.resume();
	}

	private startAudioRegion(
		audioRegion: ObjectStateNode<AudioRegion>, 
		trackGainNode: GainNode, 
		playbackTime: number
	) {
		const audioBuffer = this.audioCache.getAudioBuffer(audioRegion.fileId());
		if (!audioBuffer) return;

		const source = this.audioContext.createBufferSource();
		source.buffer = audioBuffer;
		source.connect(trackGainNode);

		// Calculate timing 
		const regionStart = this.viewportService.posToTime(audioRegion.start());
		const audioStart = audioRegion.audioStartOffset();
		const audioEnd = audioRegion.audioEndOffset();
		const duration = audioEnd - audioStart;

		const scheduleTime = this.startContextTime + (regionStart - playbackTime);
		
		if (scheduleTime >= this.startContextTime) {
			source.start(scheduleTime, audioStart, duration);
		} else {
			const playOffset = playbackTime - regionStart;
			const audioOffset = audioStart + playOffset;
			
			if (audioOffset < audioEnd && playOffset >= 0) {
				const remainingDuration = audioEnd - audioOffset;
				source.start(this.startContextTime, audioOffset, remainingDuration);
			}
		}

		this.activeAudioSources.push(source);
	}

	private startMidiRegion(
		midiRegion: ObjectStateNode<MidiRegion>, 
		trackGainNode: GainNode, 
		playbackTime: number,
		trackId: string  // Add trackId parameter
	) {
		const midiData = midiRegion.midiData.snapshot();
		if (!midiData || midiData.length === 0) return;

		const regionStart = this.viewportService.posToTime(midiRegion.start());
		const regionDuration = this.viewportService.posToTime(midiRegion.duration());

		const track = TracksService.instance.getTrack(trackId);
		
		// midi source -> gain -> reverb -> pan -> master
		const midiSource = this.synthesizerService.createMidiSource(midiData, regionStart, regionDuration, trackId, track!.trackType() as MidiTrackType)
		midiSource.connect(trackGainNode);

		const scheduleTime = this.startContextTime + (regionStart - playbackTime);

		if (scheduleTime >= this.startContextTime) {
			midiSource.start(scheduleTime, 0, regionDuration);
		} else {
			// Start from middle of region
			const playOffset = playbackTime - regionStart;
			
			if (playOffset >= 0 && playOffset < regionDuration) {
				const remainingDuration = regionDuration - playOffset;
				midiSource.start(this.startContextTime, playOffset, remainingDuration);
			}
		}

		this.activeMidiSources.push({
			source: midiSource,
			region: midiRegion
		});
	}

	private async stopPlayback() {
		this.activeAudioSources.forEach(source => {
			try {
				source.stop();
			} catch (e) {
				// Source may already be stopped
			}
		});
		this.activeAudioSources = [];

		
		this.activeMidiSources.forEach(midiInfo => {
			try {
				midiInfo.source.stop();
			} catch (e) {
				// Source may already be stopped
			}
		});
		this.activeMidiSources = [];
		this.synthesizerService.cleanup();
		
		//await this.audioContext.suspend()
		//this.trackNodes.clear();
	}

	startOneMidiNote(
		midiNote: MidiNote,
		trackId: string
	) {
		const track = TracksService.instance.getTrack(trackId)!;
		const nodes = this.checkAndUpdateTrackNodes(trackId)!;

		const note = {...midiNote, start: 0}

		const midiSource = this.instantSynthesizerService.createMidiSource(midiNote, trackId, track!.trackType() as MidiTrackType)
		midiSource.connect(nodes.gainNode);
		midiSource.start(this.audioContext.currentTime, 0);
	}

	// ==============================================================================================
	// Node Management

	public checkAndUpdateTrackNodes(trackId: string) { // checks all nodes, optimize in the future by keeping track of changed values
		const track = TracksService.instance.getTrack(trackId);
		if (!track) { this.trackNodes.delete(trackId); return null }

		let nodes = this.trackNodes.get(trackId);
		if (!nodes) { nodes = this.createTrackNodes(trackId) }

		this.updateNodeVolumeMute(trackId, track.volume(), track.mute() || TracksService.instance.isTrackMutedBySolo(trackId));
		this.updateNodePan(trackId, track.pan());
		this.updateNodeReverb(trackId, track.reverb());
		return nodes;	
	}

	private createTrackNodes(trackId: string) {
		const track = TracksService.instance.getTrack(trackId)!;

		const volume = track.volume();
		const pan = track.pan();
		const reverb = track.reverb();
		const mute = track.mute();

		const trackGainNode = this.audioContext.createGain();
		const trackPannerNode = this.audioContext.createStereoPanner();
		
		const reverbMixNode = reverb > 0 ? this.reverbProcessor.createReverbMixNode(reverb, false, this.audioContext) : null;
		
		const volumeLevel = mute ? 0 : volume / 100;
		trackGainNode.gain.value = volumeLevel;
		trackPannerNode.pan.value = pan / 100;
		
		// gain -> reverb -> panner -> master
		if (reverbMixNode) {
			trackGainNode.connect(reverbMixNode.input);
			reverbMixNode.output.connect(trackPannerNode);
		} else {
			trackGainNode.connect(trackPannerNode);
		}
		trackPannerNode.connect(this.masterGainNode);

		// store in mapping
		const nodes = {
			gainNode: trackGainNode,
			pannerNode: trackPannerNode,
			reverbMixNode: reverbMixNode,
			trackId: trackId,
		};
		this.trackNodes.set(trackId, nodes);
		
		return nodes;
	}

	public updateNodeVolumeMute(trackId: string, volume: number, mute?: boolean) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;
	
		const currentVolume = volume ?? 100; 
		const volumeLevel = mute ? 0 : currentVolume / 100;

		if (this.isPlaying()) {
			trackNodes.gainNode.gain.setTargetAtTime(volumeLevel, this.audioContext.currentTime, 0.01);
		} else {
			trackNodes.gainNode.gain.value = volumeLevel;
		}
	}
	public updateNodePan(trackId: string, pan: number) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;

		const panValue = pan / 100;

		if (this.isPlaying()) {
			trackNodes.pannerNode.pan.setTargetAtTime(panValue, this.audioContext.currentTime, 0.01);
		} else {
			trackNodes.pannerNode.pan.value = panValue;
		}
	}
	public updateNodeReverb(trackId: string, reverb: number) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;

		if (trackNodes.reverbMixNode) {
			this.reverbProcessor.updateReverbMix(trackNodes.reverbMixNode, reverb, this.audioContext, this.isPlaying());
		}
	}


	// Currently, deleted tracks still retain their nodes. 
	// May result in memory leak if user spams too many tracks and deletes them all but shouldn't cause a problem with playback.
}
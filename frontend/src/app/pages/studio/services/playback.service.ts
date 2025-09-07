import { Injectable, signal, computed, effect, Injector, runInInjectionContext } from '@angular/core';
import { StateService } from '../state/state.service';
import { ViewportService } from './viewport.service';
import { AudioCacheService } from './audio-cache.service';
import { AudioRegion, MidiNote, MidiRegion, Region, RegionType, Track } from '@shared/types';
import { RegionService } from './region.service';
import { TracksService } from './tracks.service';
import { ObjectStateNode } from '../state/state.factory';
import { PlaybackMarkerComponent } from '../components/studio-editor/viewport-overlay/playback-marker/playback-marker.component';
import { MidiSynthesizerService, MidiSource, SynthParams } from './midi-synthesizer.service';
import { ReverbProcessor } from './synthesizers/Reverb';
import { AudioRecording, AudioRecordingService } from './audio-recording.service';
import { RegionSelectService } from './region-select.service';

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
export class PlaybackService { // SINGLETON
	private static _instance: PlaybackService;
	static get instance(): PlaybackService { return PlaybackService._instance; }

	constructor(
		private injector: Injector,
		private midiSynth: MidiSynthesizerService,
		private reverbProcessor: ReverbProcessor
	) {
		PlaybackService._instance = this;
		this.audioContext = new AudioContext();
		this.masterGainNode = this.audioContext.createGain();
		this.masterGainNode.connect(this.audioContext.destination);

		this.midiSynth.initialize(this.audioContext);
		this.reverbProcessor.initialize(this.audioContext);
	}

	get viewportService() { return ViewportService.instance }
	get audioCache() { return AudioCacheService.instance }
	get tracks() { return TracksService.instance.tracks }
	get regions() { return RegionService.instance.getAllRegions(true) }

	// ==============================================================================================
	// Fields

	private audioContext: AudioContext;
	private masterGainNode: GainNode;
	private activeAudioSources: AudioBufferSourceNode[] = [];
	private activeMidiSources: MidiSourceInfo[] = [];
	private trackNodes = new Map<string, TrackNodes>();

	playbackPos = signal(0);
	playbackTime = computed(() => ViewportService.instance.posToTime(this.playbackPos()));
	playbackPx = computed(() => ViewportService.instance.posToPx(this.playbackPos()));
	basePos = signal(0);
	deltaPos = signal(0);

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
	private startAudioTime = 0;

	// ==============================================================================================
	// Control

	async play() {
		//if (this.isPlaying()) return;
		this.isPlaying.set(true);
		this.startPlaybackLineAnim();
		this.startPlayback();
		await this.audioContext.resume();
	}

	async pause() {
		//if (!this.isPlaying()) return;
		this.isPlaying.set(false);
		this.stopPlaybackLineAnim();
		this.stopPlayback();
		await this.audioContext.suspend()
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
		this.startAudioTime = this.audioContext.currentTime;
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

		this.setPlaybackPos(this.basePos() + deltaPos, true);

		const playbackLine = this.playbackLineRef?.deref(); 
		const playbackLineMidiEditor = this.playbackLineMidiEditorRef?.deref(); 
		if (playbackLine) {playbackLine.updateTransform(0)};
		if (playbackLineMidiEditor) {playbackLineMidiEditor.updateTransform(0)};
	}

	// ==============================================================================================
	// Playback

	private startPlayback() {
		const playbackTime = this.playbackTime();
		
		this.trackNodes.clear();
		this.activeAudioSources = [];
		this.activeMidiSources = [];
		this.midiSynth.stopAllNotes();

		this.tracks().forEach(track => {
			const trackId = track._id;
			const volume = track.volume();
			const pan = track.pan();
			const reverb = track.reverb();
			const mute = track.mute();

			const trackGainNode = this.audioContext.createGain();
			const trackPannerNode = this.audioContext.createStereoPanner();
			
			// Create reverb mix node if reverb is enabled
			const reverbMixNode = reverb > 0 ? this.reverbProcessor.createReverbMixNode(reverb) : null;
			
			const volumeLevel = mute ? 0 : volume / 100;
			trackGainNode.gain.value = volumeLevel;
			trackPannerNode.pan.value = pan / 100;
			
			// Connect audio chain: gain -> reverb -> panner -> master
			if (reverbMixNode) {
				// With reverb: gain -> reverb input -> reverb output -> panner -> master
				trackGainNode.connect(reverbMixNode.input);
				reverbMixNode.output.connect(trackPannerNode);
			} else {
				// Without reverb: gain -> panner -> master
				trackGainNode.connect(trackPannerNode);
			}
			
			trackPannerNode.connect(this.masterGainNode);
			
			// Store track nodes
			this.trackNodes.set(trackId, {
				gainNode: trackGainNode,
				pannerNode: trackPannerNode,
				reverbMixNode: reverbMixNode,
				trackId: trackId,
			});

			// Process all regions for this track
			track.regions().forEach(region => {
				if (region.type() === RegionType.Audio) {
					this.startAudioRegion(region as ObjectStateNode<AudioRegion>, trackGainNode, playbackTime);
				} else if (region.type() === RegionType.Midi) {
					this.startMidiRegion(
						region as ObjectStateNode<MidiRegion>, 
						trackGainNode, 
						playbackTime,
						trackId  // Pass the trackId
					);
				}
			});
		});
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

		const scheduleTime = this.startAudioTime + (regionStart - playbackTime);
		
		if (scheduleTime >= this.audioContext.currentTime) {
			source.start(scheduleTime, audioStart, duration);
		} else {
			const playOffset = playbackTime - regionStart;
			const audioOffset = audioStart + playOffset;
			
			if (audioOffset < audioEnd && playOffset >= 0) {
				const remainingDuration = audioEnd - audioOffset;
				source.start(this.audioContext.currentTime, audioOffset, remainingDuration);
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

		// MIDI source -> gain -> reverb -> pan -> master
		const midiSource = this.midiSynth.createMidiSource(
			midiData, 
			regionStart, 
			regionDuration,
			trackId
		);
		midiSource.connect(trackGainNode);

		const scheduleTime = this.startAudioTime + (regionStart - playbackTime);

		if (scheduleTime >= this.audioContext.currentTime) {
			midiSource.start(scheduleTime, 0, regionDuration);
		} else {
			// Start from middle of region
			const playOffset = playbackTime - regionStart;
			
			if (playOffset >= 0 && playOffset < regionDuration) {
				const remainingDuration = regionDuration - playOffset;
				midiSource.start(this.audioContext.currentTime, playOffset, remainingDuration);
			}
		}

		this.activeMidiSources.push({
			source: midiSource,
			region: midiRegion
		});
	}

	private stopPlayback() {
		// Stop audio sources
		this.activeAudioSources.forEach(source => {
			try {
				source.stop();
			} catch (e) {
				// Source may already be stopped
			}
		});
		this.activeAudioSources = [];

		// Stop MIDI sources (parallel to audio)
		this.activeMidiSources.forEach(midiInfo => {
			try {
				midiInfo.source.stop();
			} catch (e) {
				// Source may already be stopped
			}
		});
		this.activeMidiSources = [];
		this.midiSynth.cleanup();
		
		this.trackNodes.clear();
	}

	// ==============================================================================================
	// Realtime Updates 

	public updateNodeVolumeMute(trackId: string, volume: number, mute?: boolean) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;
	
		const currentVolume = volume ?? 100; 
		const volumeLevel = mute ? 0 : currentVolume / 100;

		trackNodes.gainNode.gain.setTargetAtTime(volumeLevel, this.audioContext.currentTime, 0.01);
	}

	public updateNodePan(trackId: string, pan: number) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;

		const panValue = pan / 100;

		trackNodes.pannerNode.pan.setTargetAtTime(panValue, this.audioContext.currentTime, 0.01);
	}

	public updateNodeReverb(trackId: string, reverb: number) {
		const trackNodes = this.trackNodes.get(trackId);
		if (!trackNodes) return;

		// If reverb is being enabled for the first time
		if (!trackNodes.reverbMixNode && reverb > 0) {
			// Need to recreate the audio chain - this is complex during playback
			// For now, we'll handle this by restarting playback if playing
			if (this.isPlaying()) {
				// Store current state
				const wasPlaying = this.isPlaying();
				const currentPos = this.playbackPos();
				
				// Restart playback with new reverb settings
				this.pause();
				setTimeout(() => {
					this.setPlaybackPos(currentPos, true);
					if (wasPlaying) this.play();
				}, 10);
			}
			return;
		}

		// If reverb exists, update the mix levels
		if (trackNodes.reverbMixNode) {
			if (reverb <= 0) {
				// Disable reverb by setting wet gain to 0 and dry gain to 1
				trackNodes.reverbMixNode.wetGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
				trackNodes.reverbMixNode.dryGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
			} else {
				// Update reverb mix levels
				this.reverbProcessor.updateReverbMix(trackNodes.reverbMixNode, reverb, this.audioContext);
			}
		}
	}

	// ==============================================================================================
	// Extras

	testMidiPlayback() {
		const audioContext = new AudioContext();
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}
		
		const midiSynthService = new MidiSynthesizerService();
		midiSynthService.initialize(audioContext);
		
		const testNotes: MidiNote[] = [{
			start: 0,
			pitch: 60,
			velocity: 100,
			duration: 1000
		}];
		
		// Use a test track ID
		const testTrackId = 'test-track-1';
		const source = midiSynthService.createMidiSource(testNotes, 0, 2000, testTrackId);
		source.connect(audioContext.destination);
		source.start(audioContext.currentTime);
	}
}
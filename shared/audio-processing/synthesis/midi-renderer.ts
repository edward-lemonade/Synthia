import { MidiNote, MidiTrackType, ProjectState, Track } from "../../types";
import { MidiSynthesizer, OfflineMidiSource, SynthParams, SynthVoice } from "./midi-synthesizer";
import { DrumParams, DrumSynthesizer, DrumVoice } from "./drum-synthesizer";
import { DEFAULT_SYNTH, SYNTHS } from "./presets/instruments";

import { AudioContext, AudioBufferSourceNode, OfflineAudioContext, OscillatorNode, GainNode, BiquadFilterNode } from 'isomorphic-web-audio-api';


export class MidiRenderer {
	declare projectState: ProjectState;

	constructor(
		projectState: ProjectState,
	) {
		this.projectState = projectState;
		this.drumSynthesizer = new DrumSynthesizer(this.posToTime);
		this.midiSynthesizer = new MidiSynthesizer(this.posToTime);
	}

	posToTime(pos: number) {
		return pos * this.projectState.studio.timeSignature.N  / this.projectState.studio.bpm * 60; // in seconds
	}

	declare midiSynthesizer: MidiSynthesizer;
	declare drumSynthesizer: DrumSynthesizer;

	// ========================================================================================
	// Offline Rendering

	createMidiSource(
		offlineAudioContext: OfflineAudioContext,
		midiData: MidiNote[], 
		regionStartTime: number, 
		regionDuration: number,
		track: Track,
		trackType: MidiTrackType,
	): OfflineMidiSource {
		const noteIds: string[] = [];
		let isConnected = false;
		let outputNode: AudioNode;

		return {
			notes: [...midiData],
			track,
			connect: (destination: AudioNode) => {
				outputNode = destination;
				isConnected = true;
			},
			start: (when: number = 0, offset: number = 0, duration?: number) => {
				if (!isConnected || !outputNode) {
					console.warn(`${trackType} MIDI source not connected to output`);
					return;
				}

				const actualDuration = duration ?? regionDuration;
				const endTime = when + actualDuration;
				
				this.processNotesOffline(
					offlineAudioContext!,
					midiData,
					when,
					offset,
					endTime,
					outputNode,
					track,
					trackType,
					noteIds
				);
				
			},
			stop: (when?: number) => {
				return;
			},	
			noteIds
		};
	}

	private processNotesOffline(
		offlineAudioContext: OfflineAudioContext,
		midiData: MidiNote[],
		when: number,
		offset: number,
		endTime: number,
		outputNode: AudioNode,
		track: Track,
		trackType: MidiTrackType,
		noteIds: string[]
	): void {
		midiData.forEach((note) => {
			const timing = this.calculateNoteTiming(note, when, offset, endTime);
			if (!timing) return;

			const { actualStartTime, actualEndTime } = timing;
			
			// Start the note based on track type
			const voice = this.startNoteByTypeOffline(
				trackType,
				note,
				actualStartTime,
				actualEndTime,
				outputNode,
				track,
				offlineAudioContext
			);
		});
	}
	private startNoteByTypeOffline(
		trackType: MidiTrackType,
		note: MidiNote,
		startTime: number,
		endTime: number,
		outputNode: AudioNode,
		track: Track,
		offlineAudioContext: OfflineAudioContext
	): DrumVoice | SynthVoice | null {
		if (trackType === MidiTrackType.Drums) {
			return this.drumSynthesizer.startNote(
				offlineAudioContext,
				outputNode,
				this.getDrumParams(note.midiNote),
				note,
				startTime,
				endTime,
			);
		} else {
			return this.midiSynthesizer.startNote(
				offlineAudioContext,
				outputNode,
				this.getSynthParams(track.instrument),
				note,
				startTime,
				endTime,
			);
		}
	}
	private calculateNoteTiming(
		note: MidiNote, 
		when: number, 
		offset: number, 
		endTime: number
	): { actualStartTime: number; actualEndTime: number } | null {
		const noteStartTime = when + this.posToTime(note.start) - offset;
		const noteEndTime = noteStartTime + this.posToTime(note.duration);

		// Skip notes outside playback range
		if (noteEndTime <= when || noteStartTime >= endTime) {
			return null;
		}
		
		// Adjust timing for partial playback
		const actualStartTime = Math.max(noteStartTime, when);
		const actualEndTime = Math.min(noteEndTime, endTime);
		const actualNoteDuration = actualEndTime - actualStartTime;
		
		// Minimum 1ms duration
		if (actualNoteDuration <= 0.001) {
			return null;
		}

		return { actualStartTime, actualEndTime };
	}
	getSynthParams(instrument: string): SynthParams {
		return {...DEFAULT_SYNTH, ...SYNTHS[instrument] ?? {}}
	}
	getDrumParams(midiNote: number): DrumParams {
		return this.drumSynthesizer.getDrumParams(this.drumSynthesizer.getDrumTypeFromMidiNote(midiNote));
	}
}
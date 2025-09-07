import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root'
})
export class ReverbProcessor {
	private impulseResponseCache = new Map<string, AudioBuffer>();
	private audioContext: AudioContext | null = null;

	initialize(audioContext: AudioContext) {
		this.audioContext = audioContext;
	}

	/**
	 * Creates a convolver node with reverb based on the reverb amount (0-100)
	 * Returns null if reverb is 0 or disabled
	 */
	createReverbNode(reverbAmount: number): ConvolverNode | null {
		if (!this.audioContext || reverbAmount <= 0) {
			return null;
		}

		const convolver = this.audioContext.createConvolver();
		const impulseResponse = this.generateImpulseResponse(reverbAmount);
		convolver.buffer = impulseResponse;
		
		return convolver;
	}

	/**
	 * Updates an existing reverb node's impulse response
	 */
	updateReverbNode(convolver: ConvolverNode, reverbAmount: number) {
		if (!this.audioContext || reverbAmount <= 0) {
			return;
		}

		const impulseResponse = this.generateImpulseResponse(reverbAmount);
		convolver.buffer = impulseResponse;
	}

	/**
	 * Generates an impulse response buffer for reverb simulation
	 * Uses a simple algorithmic approach for performance
	 */
	private generateImpulseResponse(reverbAmount: number): AudioBuffer {
		if (!this.audioContext) {
			throw new Error('AudioContext not initialized');
		}

		// Create cache key based on reverb amount and sample rate
		const cacheKey = `${reverbAmount}-${this.audioContext.sampleRate}`;
		
		if (this.impulseResponseCache.has(cacheKey)) {
			return this.impulseResponseCache.get(cacheKey)!;
		}

		// Calculate reverb parameters based on amount (0-100)
		const normalizedAmount = Math.max(0, Math.min(100, reverbAmount)) / 100;
		
		// Reverb duration: 0.5s to 3s based on amount
		const duration = 0.5 + (normalizedAmount * 2.5);
		const sampleRate = this.audioContext.sampleRate;
		const length = Math.floor(sampleRate * duration);
		
		const impulseResponse = this.audioContext.createBuffer(2, length, sampleRate);
		
		// Generate stereo impulse response
		for (let channel = 0; channel < 2; channel++) {
			const channelData = impulseResponse.getChannelData(channel);
			
			for (let i = 0; i < length; i++) {
				const t = i / sampleRate;
				
				// Exponential decay with some randomness for natural sound
				const decay = Math.exp(-3 * t / duration);
				
				// Add some early reflections and diffusion
				const earlyReflections = this.generateEarlyReflections(t, normalizedAmount);
				const diffusion = (Math.random() * 2 - 1) * decay * 0.3;
				
				// Combine components
				channelData[i] = (earlyReflections + diffusion) * normalizedAmount * 0.3;
				
				// Add stereo width variation
				if (channel === 1) {
					channelData[i] *= 0.8 + Math.sin(t * 50) * 0.2;
				}
			}
		}
		
		// Cache the generated impulse response
		this.impulseResponseCache.set(cacheKey, impulseResponse);
		
		return impulseResponse;
	}

	/**
	 * Generates early reflections pattern for more realistic reverb
	 */
	private generateEarlyReflections(time: number, intensity: number): number {
		if (time > 0.1) return 0; // Only early reflections
		
		const reflections = [
			{ delay: 0.01, gain: 0.8 },
			{ delay: 0.02, gain: 0.6 },
			{ delay: 0.035, gain: 0.4 },
			{ delay: 0.055, gain: 0.3 },
			{ delay: 0.08, gain: 0.2 }
		];
		
		let output = 0;
		
		reflections.forEach(reflection => {
			if (Math.abs(time - reflection.delay) < 0.001) {
				output += reflection.gain * intensity * (Math.random() * 0.4 + 0.8);
			}
		});
		
		return output;
	}

	/**
	 * Creates a dry/wet mix node for reverb
	 * Returns an object with input, dry, wet, and output nodes
	 */
	createReverbMixNode(reverbAmount: number): {
		input: GainNode;
		dryGain: GainNode;
		wetGain: GainNode;
		output: GainNode;
		convolver: ConvolverNode | null;
	} | null {
		if (!this.audioContext) {
			return null;
		}

		const input = this.audioContext.createGain();
		const dryGain = this.audioContext.createGain();
		const wetGain = this.audioContext.createGain();
		const output = this.audioContext.createGain();
		
		// Calculate dry/wet mix (0-100% reverb)
		const wetLevel = Math.max(0, Math.min(100, reverbAmount)) / 100;
		const dryLevel = 1 - (wetLevel * 0.7); // Don't completely remove dry signal
		
		dryGain.gain.value = dryLevel;
		wetGain.gain.value = wetLevel * 0.3; // Scale wet signal to prevent clipping
		
		// Create reverb convolver if needed
		const convolver = this.createReverbNode(reverbAmount);
		
		// Connect the nodes
		// input -> dryGain -> output (dry path)
		input.connect(dryGain);
		dryGain.connect(output);
		
		if (convolver) {
			// input -> convolver -> wetGain -> output (wet path)
			input.connect(convolver);
			convolver.connect(wetGain);
			wetGain.connect(output);
		}
		
		return {
			input,
			dryGain,
			wetGain,
			output,
			convolver
		};
	}

	/**
	 * Updates the dry/wet mix levels for an existing reverb mix node
	 */
	updateReverbMix(mixNode: {
		dryGain: GainNode;
		wetGain: GainNode;
		convolver: ConvolverNode | null;
	}, reverbAmount: number, audioContext: AudioContext) {
		const wetLevel = Math.max(0, Math.min(100, reverbAmount)) / 100;
		const dryLevel = 1 - (wetLevel * 0.7);
		
		const currentTime = audioContext.currentTime;
		
		mixNode.dryGain.gain.setTargetAtTime(dryLevel, currentTime, 0.01);
		mixNode.wetGain.gain.setTargetAtTime(wetLevel * 0.3, currentTime, 0.01);
		
		// Update convolver if reverb amount changed significantly
		if (mixNode.convolver && reverbAmount > 0) {
			this.updateReverbNode(mixNode.convolver, reverbAmount);
		}
	}

	/**
	 * Clears the impulse response cache (useful for memory management)
	 */
	clearCache() {
		this.impulseResponseCache.clear();
	}
}
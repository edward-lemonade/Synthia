export class ReverbProcessor {
	private impulseResponseCache = new Map<string, AudioBuffer>();

	constructor() {}

	private createReverbNode(
		reverbAmount: number, 
		offline: boolean = false, 
		audioContext?: AudioContext | OfflineAudioContext
	): ConvolverNode | null {
		const ctx = audioContext;
		
		if (!ctx || reverbAmount <= 0) {
			return null;
		}

		const convolver = ctx.createConvolver();
		const impulseResponse = this.generateImpulseResponse(reverbAmount, offline, ctx);
		convolver.buffer = impulseResponse;
		
		return convolver;
	}

	private updateReverbNode(
		convolver: ConvolverNode, 
		reverbAmount: number, 
		offline: boolean = false, 
		audioContext?: AudioContext | OfflineAudioContext
	) {
		const ctx = audioContext;
		
		if (!ctx || reverbAmount <= 0) {
			return;
		}

		const impulseResponse = this.generateImpulseResponse(reverbAmount, offline, ctx);
		convolver.buffer = impulseResponse;
	}

	private generateImpulseResponse(
		reverbAmount: number, 
		offline: boolean = false, 
		audioContext?: AudioContext | OfflineAudioContext
	): AudioBuffer {
		const ctx = audioContext;
		
		if (!ctx) {
			throw new Error('AudioContext not initialized');
		}

		// Create cache key based on reverb amount and sample rate
		const cacheKey = `${reverbAmount}-${ctx.sampleRate}`;
		
		// For offline rendering, don't use cache to avoid cross-context issues
		if (!offline && this.impulseResponseCache.has(cacheKey)) {
			return this.impulseResponseCache.get(cacheKey)!;
		}

		// Calculate reverb parameters based on amount (0-100)
		const normalizedAmount = Math.max(0, Math.min(100, reverbAmount)) / 100;
		
		// Reverb duration: 0.5s to 3s based on amount
		const duration = 0.5 + (normalizedAmount * 2.5);
		const sampleRate = ctx.sampleRate;
		const length = Math.floor(sampleRate * duration);
		
		const impulseResponse = ctx.createBuffer(2, length, sampleRate);
		
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
		
		// Only cache for realtime contexts to avoid memory leaks
		if (!offline) {
			this.impulseResponseCache.set(cacheKey, impulseResponse);
		}
		
		return impulseResponse;
	}

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

	createReverbMixNode(
		reverbAmount: number, 
		offline: boolean = false, 
		audioContext: AudioContext | OfflineAudioContext
	): {
		input: GainNode;
		dryGain: GainNode;
		wetGain: GainNode;
		output: GainNode;
		convolver: ConvolverNode | null;
	} | null {
		const ctx = audioContext;
		
		if (!ctx) {
			return null;
		}

		const input = ctx.createGain();
		const dryGain = ctx.createGain();
		const wetGain = ctx.createGain();
		const output = ctx.createGain();
		
		// Calculate dry/wet mix (0-100% reverb)
		const wetLevel = Math.max(0, Math.min(100, reverbAmount)) / 100;
		const dryLevel = 1 - (wetLevel * 0.7); // Don't completely remove dry signal
		
		dryGain.gain.value = dryLevel;
		wetGain.gain.value = wetLevel * 0.3; // Scale wet signal to prevent clipping
		
		// Create reverb convolver if needed
		const convolver = this.createReverbNode(reverbAmount, offline, ctx);
		
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

	updateReverbMix(
		mixNode: {
			dryGain: GainNode;
			wetGain: GainNode;
			convolver: ConvolverNode | null;
		}, 
		reverbAmount: number, 
		audioContext: AudioContext | OfflineAudioContext,
		offline: boolean = false
	) {
		const wetLevel = Math.max(0, Math.min(100, reverbAmount)) / 100;
		const dryLevel = 1 - (wetLevel * 0.7);
		
		// For offline rendering, set values immediately
		if (offline) {
			mixNode.dryGain.gain.value = dryLevel;
			mixNode.wetGain.gain.value = wetLevel * 0.3;
		} else {
			// For realtime, use smooth transitions
			const currentTime = audioContext.currentTime;
			mixNode.dryGain.gain.setTargetAtTime(dryLevel, currentTime, 0.01);
			mixNode.wetGain.gain.setTargetAtTime(wetLevel * 0.3, currentTime, 0.01);
		}
		
		// Update convolver if reverb amount changed significantly
		if (mixNode.convolver && reverbAmount > 0) {
			this.updateReverbNode(mixNode.convolver, reverbAmount, offline, audioContext);
		}
	}

	clearCache() {
		this.impulseResponseCache.clear();
	}
}
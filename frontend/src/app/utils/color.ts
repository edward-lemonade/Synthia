export function hexToHsl(hex: string): { h: number; s: number; l: number } {
	hex = hex.replace('#', '');
	const bigint = parseInt(hex.substring(0, 6), 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;

	const rNorm = r / 255;
	const gNorm = g / 255;
	const bNorm = b / 255;

	const max = Math.max(rNorm, gNorm, bNorm);
	const min = Math.min(rNorm, gNorm, bNorm);
	let h = 0, s = 0;
	let l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
			case gNorm: h = (bNorm - rNorm) / d + 2; break;
			case bNorm: h = (rNorm - gNorm) / d + 4; break;
		}
		h /= 6;
	}	

	return { h: h * 360, s: s * 100, l: l * 100 };
}
export function hslToCss(h: number, s: number, l: number): string {
	return `hsl(${h}, ${s}%, ${l}%)`;
}
export function getRegionGhostColor(baseColor: string): string {
	if (baseColor.startsWith('#')) {
		const r = parseInt(baseColor.slice(1, 3), 16);
		const g = parseInt(baseColor.slice(3, 5), 16);
		const b = parseInt(baseColor.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, 0.4)`;
	}

	const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
	if (rgbMatch) {
		return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.4)`;
	}
	
	return 'rgba(0, 123, 255, 0.4)';
}
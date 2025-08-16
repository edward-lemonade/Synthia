import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-rotary-knob',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './rotary-knob.component.html',
  	styleUrls: ['./rotary-knob.component.scss'],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => RotaryKnobComponent),
			multi: true
		}
	]
})
export class RotaryKnobComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
	@Input() min: number = -100;
	@Input() max: number = 100;
	@Input() step: number = 1;
	@Input() size: number = 24;
	@Input() color: string = '#FFFFFF';
	@Input() showValue: boolean = true;
	@Input() disabled: boolean = false;
	@Input() precision: number = 0;
	
	@Output() blur = new EventEmitter<void>();
	@Output() change = new EventEmitter<number>();
	
	@ViewChild('knobSvg', { static: true }) knobSvg!: ElementRef<SVGElement>;
	
	MAX_ANGLE = 135;
	RADIUS = 40;
	STROKE_WIDTH = 10;

	public isDragging: boolean = false;
	private knobAngle = signal<number>(0);
	
	// Computed value based on the angle
	private _value = computed(() => {
		const angle = this.knobAngle();
		const normalizedAngle = (angle + this.MAX_ANGLE) / (2*this.MAX_ANGLE); // 0 to 1
		const rawValue = this.min + (normalizedAngle * (this.max - this.min));
		
		// Apply step and precision
		const steppedValue = Math.round(rawValue / this.step) * this.step;
		return Number(steppedValue.toFixed(this.precision));
	});
	

	private previousEmittedValue: number = 0;
	
	// ControlValueAccessor implementation
	private onChange = (value: number) => {};
	private onTouched = () => {};
	
	ngAfterViewInit() {
		// Add global mouse/touch event listeners
		document.addEventListener('mousemove', this.onMouseMove.bind(this));
		document.addEventListener('mouseup', this.onMouseUp.bind(this));
		document.addEventListener('touchmove', this.onTouchMove.bind(this));
		document.addEventListener('touchend', this.onTouchEnd.bind(this));
	}
	
	ngOnDestroy() {
		// Clean up event listeners
		document.removeEventListener('mousemove', this.onMouseMove.bind(this));
		document.removeEventListener('mouseup', this.onMouseUp.bind(this));
		document.removeEventListener('touchmove', this.onTouchMove.bind(this));
		document.removeEventListener('touchend', this.onTouchEnd.bind(this));
	}
	
	get value(): number {
		return this._value();
	}
	set value(val: number) {
		const clampedValue = Math.max(this.min, Math.min(this.max, val));
		
		// Convert value to angle and update the angle signal
		const normalizedValue = (clampedValue - this.min) / (this.max - this.min);
		const newAngle = -this.MAX_ANGLE + (normalizedValue * 2*this.MAX_ANGLE);
		this.knobAngle.set(newAngle);
		
		// Emit change events if the computed value actually changed
		const computedValue = this._value();
		if (computedValue !== this.previousEmittedValue) {
			this.previousEmittedValue = computedValue;
			this.onChange(computedValue);
			this.change.emit(computedValue);
		}
	}
	get displayValue(): string {
		return this._value().toFixed(this.precision);
	}
	
	getProgressArcPath(): string {
		const currentAngle = this.knobAngle();
		const centerAngle = 0; // 0° is at the top (center position)
		
		const centerX = 50;
		const centerY = 50;
		const radius = this.RADIUS;
		
		// Convert angles to radians and adjust for SVG coordinate system
		// In SVG: 0° is right, 90° is down. We want 0° to be up.
		const centerAngleRad = ((centerAngle - 90) * Math.PI) / 180;
		const currentAngleRad = ((currentAngle - 90) * Math.PI) / 180;
		
		const centerX_pos = centerX + radius * Math.cos(centerAngleRad);
		const centerY_pos = centerY + radius * Math.sin(centerAngleRad);
		const currentX = centerX + radius * Math.cos(currentAngleRad);
		const currentY = centerY + radius * Math.sin(currentAngleRad);
		
		// Determine arc direction and sweep
		const angleDiff = currentAngle - centerAngle;
		const absAngleDiff = Math.abs(angleDiff);
		
		if (absAngleDiff < 1) {
			// Very small angle, just draw a point
			return `M ${centerX_pos} ${centerY_pos}`;
		}
		
		const largeArcFlag = absAngleDiff > 180 ? 1 : 0;
		const sweepFlag = angleDiff > 0 ? 1 : 0; // 1 for clockwise, 0 for counter-clockwise
		
		return `M ${centerX_pos} ${centerY_pos} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${currentX} ${currentY}`;
	}
	
	getIndicatorStart(): { x: number, y: number } {
		const angle = this.knobAngle();
		const centerX = 50;
		const centerY = 50;
		const radius = 20;
		
		return {
			x: centerX + radius * Math.cos((angle-90) * Math.PI / 180),
			y: centerY + radius * Math.sin((angle-90) * Math.PI / 180)
		};
	}
	getIndicatorEnd(): { x: number, y: number } {
		const angle = this.knobAngle();
		const centerX = 50;
		const centerY = 50;
		const radius = this.RADIUS;
		
		return {
			x: centerX + radius * Math.cos((angle-90) * Math.PI / 180),
			y: centerY + radius * Math.sin((angle-90) * Math.PI / 180)
		};
	}
	
	private getAngleFromEvent(event: MouseEvent | TouchEvent): number {
		const rect = this.knobSvg.nativeElement.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		
		let clientX: number, clientY: number;
		
		if (event instanceof MouseEvent) {
			clientX = event.clientX;
			clientY = event.clientY;
		} else {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		}
		
		const dx = clientX - centerX;
		const dy = clientY - centerY;
		
		// Calculate angle from center, with 0° pointing up (north)
		// Adjust so that 0° is at the top, positive angles go clockwise
		let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
		
		// Normalize to -180 to +180 range
		if (angle > 180) angle -= 360;
		if (angle < -180) angle += 360;
		
		return angle;
	}
	
	onMouseDown(event: MouseEvent) {
		if (this.disabled) return;
		
		event.preventDefault();
		this.startDrag(event);
	}
	
	onTouchStart(event: TouchEvent) {
		if (this.disabled) return;
		
		event.preventDefault();
		this.startDrag(event);
	}
	
	private startDrag(event: MouseEvent | TouchEvent) {
		this.isDragging = true;
		// Immediately snap to mouse position
		this.updateKnobPosition(event);
	}
	
	onMouseMove(event: MouseEvent) {
		if (!this.isDragging || this.disabled) return;
		this.updateKnobPosition(event);
	}
	
	onTouchMove(event: TouchEvent) {
		if (!this.isDragging || this.disabled) return;
		event.preventDefault();
		this.updateKnobPosition(event);
	}
	
	private updateKnobPosition(event: MouseEvent | TouchEvent) {
		const mouseAngle = this.getAngleFromEvent(event);
		const clampedAngle = Math.max(-this.MAX_ANGLE, Math.min(this.MAX_ANGLE, mouseAngle));

		this.knobAngle.set(clampedAngle);
		
		// Emit change events if the computed value changed
		const computedValue = this._value();
		if (computedValue !== this.previousEmittedValue) {
			this.previousEmittedValue = computedValue;
			this.onChange(computedValue);
			this.change.emit(computedValue);
		}
	}
	
	onMouseUp(event: MouseEvent) {
		if (this.isDragging) {
			this.endDrag();
		}
	}
	
	onTouchEnd(event: TouchEvent) {
		if (this.isDragging) {
			this.endDrag();
		}
	}
	
	private endDrag() {
		this.isDragging = false;
		this.onTouched();
		this.blur.emit();
	}
	
	// ControlValueAccessor methods
	writeValue(value: number): void {
		if (value !== undefined && value !== null) {
			const clampedValue = Math.max(this.min, Math.min(this.max, value));
			// Convert value to angle and update the angle signal
			const normalizedValue = (clampedValue - this.min) / (this.max - this.min);
			const newAngle = -this.MAX_ANGLE + (normalizedValue * 2*this.MAX_ANGLE);
			this.knobAngle.set(newAngle);
			this.previousEmittedValue = this._value();
		}
	}
	
	registerOnChange(fn: (value: number) => void): void {
		this.onChange = fn;
	}
	
	registerOnTouched(fn: () => void): void {
		this.onTouched = fn;
	}
	
	setDisabledState(isDisabled: boolean): void {
		this.disabled = isDisabled;
	}
}
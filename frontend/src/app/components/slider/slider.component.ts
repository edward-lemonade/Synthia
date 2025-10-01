import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, ViewChild, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-slider',
	standalone: true,
	imports: [CommonModule],
	templateUrl: './slider.component.html',
	styleUrls: ['./slider.component.scss'],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => SliderComponent),
			multi: true
		}
	]
})
export class SliderComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
	@Input() min: number = 0;
	@Input() max: number = 100;
	@Input() step: number = 1;
	@Input() width: number = 200;
	@Input() height: number = 24;
	@Input() color: string = '#FFFFFF';
	@Input() showValue: boolean = true;
	@Input() disabled: boolean = false;
	@Input() precision: number = 0;
	@Input() thumbRadius: number = 8;
	@Input() flex: 'none' | 'width' | 'height' | 'both' = 'none';
	
	@Output() blur = new EventEmitter<void>();
	@Output() change = new EventEmitter<number>();
	
	@ViewChild('sliderTrack', { static: true }) sliderTrack!: ElementRef<HTMLDivElement>;
	
	public isDragging: boolean = false;
	private sliderPosition = signal<number>(0); // 0 to 1
	
	// Computed value based on the position
	private _value = computed(() => {
		const position = this.sliderPosition();
		const rawValue = this.min + (position * (this.max - this.min));
		
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
		document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
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
		
		// Convert value to position and update the position signal
		const normalizedValue = (clampedValue - this.min) / (this.max - this.min);
		this.sliderPosition.set(normalizedValue);
		
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
	
	get containerStyle(): any {
		const style: any = {};
		
		if (this.flex === 'width' || this.flex === 'both') {
			style.width = '100%';
		} else {
			style.width = `${this.width}px`;
		}
		
		if (this.flex === 'height' || this.flex === 'both') {
			style.height = '100%';
		} else {
			style.height = `${this.height}px`;
		}
		
		return style;
	}
	
	get thumbPosition(): number {
		return this.sliderPosition() * 100; // percentage
	}
	
	get progressWidth(): number {
		return this.sliderPosition() * 100; // percentage
	}
	
	private getPositionFromEvent(event: MouseEvent | TouchEvent): number {
		const rect = this.sliderTrack.nativeElement.getBoundingClientRect();
		
		let clientX: number;
		
		if (event instanceof MouseEvent) {
			clientX = event.clientX;
		} else {
			clientX = event.touches[0].clientX;
		}
		
		// Calculate position relative to track
		const position = (clientX - rect.left) / rect.width;
		
		// Clamp between 0 and 1
		return Math.max(0, Math.min(1, position));
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
		this.updateSliderPosition(event);
	}
	
	onMouseMove(event: MouseEvent) {
		if (!this.isDragging || this.disabled) return;
		this.updateSliderPosition(event);
	}
	
	onTouchMove(event: TouchEvent) {
		if (!this.isDragging || this.disabled) return;
		event.preventDefault();
		this.updateSliderPosition(event);
	}
	
	private updateSliderPosition(event: MouseEvent | TouchEvent) {
		const position = this.getPositionFromEvent(event);
		this.sliderPosition.set(position);
		
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
			// Convert value to position and update the position signal
			const normalizedValue = (clampedValue - this.min) / (this.max - this.min);
			this.sliderPosition.set(normalizedValue);
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
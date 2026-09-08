import { Component, Input, Optional, Self, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor, VariantRounded } from '../../../variants';

@Component({
  selector: 'av-checkbox',
  standalone: true,
  imports: [CommonModule, AvIcon],
  templateUrl: './av-checkbox.component.html',
  styleUrls: ['./av-checkbox.component.css'],
})
export class AvCheckboxComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() ringColor: VariantColor = 'blue';
  @Input() icon: string = 'check';
  @Input() iconProvider: IconType = 'av';

  rounded = input<VariantRounded>('md');
  errorMessage = input<string>('');

  changed = output<boolean>();

  value = signal<boolean>(false);
  disabled = signal<boolean>(false);

  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get boxClasses(): string {
    return [
      `av-checkbox__box--rounded-${this.rounded()}`,
      this.value() ? `av-checkbox__box--${this.ringColor}` : 'av-checkbox__box--unchecked',
      this.isInvalid ? 'av-checkbox__box--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get iconClasses(): string {
    return [
      'av-checkbox__icon',
      this.value() ? 'av-checkbox__icon--checked' : 'av-checkbox__icon--unchecked',
    ].join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  toggle(): void {
    if (this.disabled()) return;
    const newValue = !this.value();
    this.value.set(newValue);
    this.onChange(newValue);
    this.onTouched();
    this.changed.emit(newValue);
  }

  // ControlValueAccessor
  writeValue(value: boolean): void {
    this.value.set(!!value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

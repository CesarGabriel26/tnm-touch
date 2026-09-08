import { Component, Input, Optional, Self, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { VariantColor, VariantRounded } from '../../../variants';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';


@Component({
  selector: 'av-toggle',
  standalone: true,
  imports: [CommonModule, AvIcon],
  templateUrl: './av-toggle.component.html',
  styleUrls: ['./av-toggle.component.css'],
})
export class AvToggleComponent implements ControlValueAccessor {
  @Input() icon: string = '';
  @Input() variant: VariantColor | string = 'gray'
  rounded = input<VariantRounded>('full');

  value = signal<boolean>(false);
  disabled = signal<boolean>(false);

  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get trackClasses(): string {
    return [
      'av-toggle__track',
      `av-toggle__track--${this.variant}`,
      `av-toggle__track--rounded-${this.rounded()}`,
      this.value() ? 'av-toggle__track--checked' : '',
      this.disabled() ? 'av-toggle__track--disabled' : '',
    ].filter(Boolean).join(' ');
  }

  get thumbClasses(): string {
    return [
      'av-toggle__thumb',
      `av-toggle__thumb--rounded-${this.rounded()}`,
      this.value() ? 'av-toggle__thumb--checked' : '',
    ].filter(Boolean).join(' ');
  }

  toggle(): void {
    if (this.disabled()) return;
    this.value.set(!this.value());
    this.onChange(this.value());
    this.onTouched();
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

import { Component, EventEmitter, Input, Optional, Output, Self, signal } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { IconType } from '../../../types';
import { VariantColor, VariantRounded } from '../../../variants';
import { AvButtonComponent } from '../av-button/av-button.component';

export type AvToggleGroupValue = string | number | boolean;

export interface AvToggleGroupOption {
  label: string;
  value: AvToggleGroupValue;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'av-toggle-group',
  standalone: true,
  imports: [AvButtonComponent],
  templateUrl: './av-toggle-group.component.html',
  styleUrl: './av-toggle-group.component.css',
})
export class AvToggleGroupComponent implements ControlValueAccessor {
  @Input() options: AvToggleGroupOption[] = [];
  @Input() variant: VariantColor | string = 'orange';
  @Input() inactiveVariant: VariantColor | string = 'gray-outlined';
  @Input() rounded: VariantRounded | string = 'md';
  @Input() iconProvider: IconType = 'material';
  @Input() ariaLabel = 'Selecionar opção';

  @Output() valueChange = new EventEmitter<AvToggleGroupValue>();

  value = signal<AvToggleGroupValue | null>(null);
  disabled = signal<boolean>(false);

  onChange: (value: AvToggleGroupValue) => void = () => { };
  onTouched: () => void = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  select(option: AvToggleGroupOption): void {
    if (this.disabled() || option.disabled) return;

    this.value.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.onTouched();
  }

  isSelected(option: AvToggleGroupOption): boolean {
    return this.value() === option.value;
  }

  buttonVariant(option: AvToggleGroupOption): VariantColor | string {
    return this.isSelected(option) ? this.variant : this.inactiveVariant;
  }

  writeValue(value: AvToggleGroupValue | null | undefined): void {
    this.value.set(value === undefined ? null : value);
  }

  registerOnChange(fn: (value: AvToggleGroupValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

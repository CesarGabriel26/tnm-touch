import {
  Component,
  Input,
  Self,
  Optional,
  ElementRef,
  ViewChild,
  AfterViewInit,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NgControl,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor } from '../../../variants';

@Component({
  selector: 'av-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AvIcon],
  templateUrl: './av-input.component.html',
  styleUrls: ['./av-input.component.css'],
})
export class AvInputComponent implements ControlValueAccessor, AfterViewInit {
  @Input() placeholder: string = '';
  @Input() type: string = 'text';
  @Input() label: string = '';

  @Input() icon: string = '';
  @Input() iconProvider: IconType = 'av';
  @Input() autoFocus: boolean = false;
  @Input() ringColor: VariantColor = 'gray';

  errorMessage = input<string>('');

  @ViewChild('inputRef') inputEl!: ElementRef<HTMLInputElement>;

  value: any = '';
  disabled: boolean = false;



  // Funções de callback registradas pelo Angular Forms
  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngAfterViewInit(): void {
    if (this.autoFocus && this.inputEl) {
      setTimeout(() => this.inputEl.nativeElement.focus(), 0);
    }
  }

  get controlClasses(): string {
    return [
      `av-input__control--${this.ringColor}`,
      this.isInvalid ? 'av-input__control--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}

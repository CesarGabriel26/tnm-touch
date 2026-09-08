import {
  Component,
  ElementRef,
  Input,
  Optional,
  Self,
  ViewChild,
  signal,
  input,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NgControl, ReactiveFormsModule } from '@angular/forms';
import { IconType } from '../../../types';
import { VariantColor } from '../../../variants';

@Component({
  selector: 'av-currency-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './av-currency-input.component.html',
  styleUrls: ['./av-currency-input.component.css'],
})
export class AvCurrencyInputComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label: string = '';
  @Input() currencySymbol: string = 'R$';
  @Input() locale: string = 'pt-BR';
  @Input() currencyCode: string = 'BRL';
  @Input() icon: string = 'payments';
  @Input() iconProvider: IconType = 'av';
  @Input() ringColor: VariantColor = 'blue';
  @Input() autoFocus: boolean = false;

  errorMessage = input<string>('');

  @ViewChild('inputRef') inputEl!: ElementRef<HTMLInputElement>;

  // Armazena o texto formatado para o input visual (ex: "R$ 1.250,50")
  formattedValue = signal<string>('');

  // Valor numérico bruto emitido para o Angular Forms (ex: 1250.50)
  rawValue = signal<number | null>(null);
  disabled = signal<boolean>(false);


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
      `av-currency-input__control--${this.ringColor}`,
      this.isInvalid ? 'av-currency-input__control--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  // Formata o número bruto recebido do Form para o formato de moeda
  private formatCurrency(value: number | null): string {
    if (value === null || isNaN(value)) return '';

    return new Intl.NumberFormat(this.locale, {
      style: 'decimal', // Remove o R$ e mantém apenas a pontuação e os decimais
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Intercepta a digitação, extrai apenas dígitos e recalcula o valor decimal
  onInput(event: Event): void {
    const inputNode = event.target as HTMLInputElement;
    const digits = inputNode.value.replace(/\D/g, '');

    if (!digits) {
      this.rawValue.set(null);
      this.formattedValue.set('');
      this.onChange(null);
      return;
    }

    // Transforma a sequência de dígitos no número com centavos (ex: "1250" -> 12.50)
    const numericValue = parseFloat(digits) / 100;

    this.rawValue.set(numericValue);
    this.formattedValue.set(this.formatCurrency(numericValue));

    // Força o valor formatado no campo e emite apenas o NUMBER para o formulário
    inputNode.value = this.formattedValue();
    this.onChange(numericValue);
  }

  // ControlValueAccessor API
  writeValue(value: number | null): void {
    const num = typeof value === 'number' ? value : null;
    this.rawValue.set(num);
    this.formattedValue.set(this.formatCurrency(num));
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

import {
  Component,
  ElementRef,
  Input,
  Optional,
  Self,
  ViewChild,
  signal,
  computed,
  input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NgControl, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor } from '../../../variants';

export type DatePickerMode = 'date' | 'time' | 'datetime';

@Component({
  selector: 'av-date-picker',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OverlayModule, AvIcon],
  templateUrl: './av-date-time-picker.component.html',
  styleUrls: ['./av-date-time-picker.component.css'],
})
export class AvDateTimePickerComponent implements ControlValueAccessor {
  @Input() mode: DatePickerMode = 'datetime';
  @Input() label: string = '';
  @Input() placeholder: string = 'Selecione...';
  @Input() iconProvider: IconType = 'av';
  @Input() ringColor: VariantColor = 'blue';

  errorMessage = input<string>('');

  @ViewChild('triggerEl') triggerEl!: ElementRef<HTMLDivElement>;

  isOpen = signal<boolean>(false);
  disabled = signal<boolean>(false);

  // Estado da data e hora selecionadas
  selectedDate = signal<Date | null>(null);
  viewDate = signal<Date>(new Date()); // Data usada para navegar no mês do calendário
  activeTab = signal<'date' | 'time'>('date');

  // Relógio
  hours = signal<number>(12);
  minutes = signal<number>(0);
  timeUnit = signal<'hours' | 'minutes'>('hours'); // Qual ponteiro o relógio está ajustando


  onChange: any = () => {};
  onTouched: any = () => {};

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // Dias da semana para o cabeçalho do calendário
  readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Gera a grade de dias do mês atual
  calendarDays = computed(() => {
    const year = this.viewDate().getFullYear();
    const month = this.viewDate().getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];

    // Preenche espaços vazios antes do dia 1
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Preenche os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  });

  get triggerClasses(): string {
    return [
      `av-date-picker__trigger--${this.ringColor}`,
      this.isOpen() ? 'av-date-picker__trigger--open' : '',
      this.disabled() ? 'av-date-picker__trigger--disabled' : '',
      this.isInvalid ? 'av-date-picker__trigger--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get panelClasses(): string {
    return ['av-date-picker__panel', `av-date-picker__panel--${this.ringColor}`].join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  get defaultIcon(): string {
    if (this.mode === 'time') return 'schedule';
    return 'calendar_today';
  }

  // Texto formatado para o input principal
  displayValue = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';

    if (this.mode === 'date') {
      return date.toLocaleDateString('pt-BR');
    }
    if (this.mode === 'time') {
      return `${String(this.hours()).padStart(2, '0')}:${String(this.minutes()).padStart(2, '0')}`;
    }
    return `${date.toLocaleDateString('pt-BR')} ${String(this.hours()).padStart(2, '0')}:${String(this.minutes()).padStart(2, '0')}`;
  });

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      this.activeTab.set(this.mode === 'time' ? 'time' : 'date');
    } else {
      this.onTouched();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.onTouched();
  }

  // Navegação do calendário
  changeMonth(offset: number): void {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  selectDay(day: Date | null): void {
    if (!day) return;

    const current = this.selectedDate() || new Date();
    const updated = new Date(day.getFullYear(), day.getMonth(), day.getDate(), this.hours(), this.minutes());

    this.selectedDate.set(updated);

    if (this.mode === 'datetime') {
      this.activeTab.set('time'); // Avança para a hora no modo datetime
    } else if (this.mode === 'date') {
      this.emitValue(updated);
      this.closeDropdown();
    }
  }

  // Lógica do Relógio Analógico/Radial estilo Alarme
  selectClockValue(value: number): void {
    if (this.timeUnit() === 'hours') {
      this.hours.set(value);
      this.timeUnit.set('minutes'); // Alterna automaticamente para os minutos
    } else {
      this.minutes.set(value);
    }
    this.updateTimeInSelectedDate();
  }

  updateTimeInSelectedDate(): void {
    const current = this.selectedDate() || new Date();
    const updated = new Date(current.getFullYear(), current.getMonth(), current.getDate(), this.hours(), this.minutes());
    this.selectedDate.set(updated);
    this.emitValue(updated);
  }

  isDaySelected(day: Date | null): boolean {
    if (!day || !this.selectedDate()) return false;
    const sel = this.selectedDate()!;
    return day.getDate() === sel.getDate() &&
           day.getMonth() === sel.getMonth() &&
           day.getFullYear() === sel.getFullYear();
  }

  private emitValue(date: Date): void {
    this.onChange(date.toISOString());
  }

  // ControlValueAccessor
  writeValue(value: any): void {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        this.selectedDate.set(date);
        this.viewDate.set(date);
        this.hours.set(date.getHours());
        this.minutes.set(date.getMinutes());
      }
    } else {
      this.selectedDate.set(null);
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void { this.disabled.set(isDisabled); }
}

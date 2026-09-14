import {
  Component,
  ElementRef,
  input,
  Input,
  Optional,
  Self,
  ViewChild,
  signal,
  computed,
  effect,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NgControl, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor } from '../../../variants';

@Component({
  selector: 'av-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, OverlayModule, AvIcon],
  styleUrls: ['./av-select.component.css'],
  templateUrl: './av-select.component.html',
})
export class AvSelectComponent implements ControlValueAccessor {
  data = input.required<any[]>();

  @Input() labelKey: string = 'label';
  @Input() labelFormat: string = '';
  @Input() valueKey: string = 'value';
  @Input() placeholder: string = 'Selecione uma opção';
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() iconProvider: IconType = 'av';
  @Input() ringColor: VariantColor = 'blue';
  @Input() searchPlaceholder: string = 'Pesquisar...';
  @Input() searchable: boolean = true

  value = input<any>(null)

  /** Função customizada opcional para lidar com busca remota/assíncrona */
  @Input() onSearch?: (searchQuery: string) => void;

  valueChange = output<any>();

  errorMessage = input<string>('');

  @ViewChild('triggerEl') triggerEl!: ElementRef<HTMLDivElement>;

  // Sinais de controle do estado interno
  isOpen = signal<boolean>(false);
  searchTerm = signal<string>('');
  _value = signal<any>(null);
  disabled = signal<boolean>(false);


  // Funções de callback do ControlValueAccessor
  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      this._value.set(this.value())
    })
  }

  // Lista filtrada (caso não haja callback customizado de busca)
  filteredData = computed(() => {
    const query = this.searchTerm().toLowerCase().trim();
    const items = this.data() || [];

    if (!query || this.onSearch) return items;

    return items.filter(item => {
      const labelValue = this.getItemLabel(item);
      return String(labelValue).toLowerCase().includes(query);
    });
  });

  // Retorna o item selecionado atualmente para exibição no input principal
  selectedOption = computed(() => {
    const items = this.data() || [];
    return items.find(item => this.getItemValue(item) === this._value());
  });

  get triggerClasses(): string {
    return [
      `av-select__trigger--${this.ringColor}`,
      this.isOpen() ? 'av-select__trigger--open' : '',
      this.disabled() ? 'av-select__trigger--disabled' : '',
      this.isInvalid ? 'av-select__trigger--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get panelClasses(): string {
    return ['av-select__panel', `av-select__panel--${this.ringColor}`].join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  // Auxiliares para extrair as chaves de objetos dinâmicos
  getItemLabel(item: any): string {
    if (typeof item === 'object' && item !== null) {

      if (!this.labelFormat || this.labelFormat.trim() === '') {
        return item[this.labelKey];
      }

      let label = this.labelFormat;

      Object.keys(item).forEach(key => {
        // Reatribui o resultado para a variável 'label'
        label = label.replaceAll(`{${key}}`, item[key] ?? '');
      });

      return label;
    } else {
      return item;
    }
  }

  getItemValue(item: any): any {
    return typeof item === 'object' && item !== null ? item[this.valueKey] : item;
  }

  isSelected(item: any): boolean {
    return this.getItemValue(item) === this._value();
  }

  toggleDropdown(): void {
    if (this.disabled()) return;
    this.isOpen.set(!this.isOpen());
    if (!this.isOpen()) {
      this.onTouched();
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
  }

  selectOption(item: any): void {
    const val = this.getItemValue(item);
    this._value.set(val);
    this.onChange(val);
    this.valueChange.emit(val);
    this.closeDropdown();
  }

  handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchTerm.set(query);

    if (this.onSearch) {
      this.onSearch(query);
    }
  }

  // ControlValueAccessor API
  writeValue(value: any): void {
    this._value.set(value);
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

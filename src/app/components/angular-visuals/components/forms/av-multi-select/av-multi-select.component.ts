import {
  Component,
  ElementRef,
  input,
  Input,
  Optional,
  Self,
  ViewChild,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NgControl, ReactiveFormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { IconType } from '../../../types';
import { AvIconComponent as AvIcon } from '../../icons/av-icon/av-icon.component';
import { VariantColor } from '../../../variants';

@Component({
  selector: 'av-multi-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, OverlayModule, AvIcon],
  styleUrls: ['./av-multi-select.component.css'],
  templateUrl: './av-multi-select.component.html',
})
export class AvMultiSelectComponent implements ControlValueAccessor {
  data = input.required<any[]>();

  @Input() labelKey: string = 'label';
  @Input() valueKey: string = 'value';
  @Input() placeholder: string = 'Selecione as opções';
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() iconProvider: IconType = 'av';
  @Input() ringColor: VariantColor = 'blue';
  @Input() searchPlaceholder: string = 'Pesquisar...';
  @Input() onSearch?: (searchQuery: string) => void;

  errorMessage = input<string>('');

  @ViewChild('triggerEl') triggerEl!: ElementRef<HTMLDivElement>;

  // Sinais de controle interno
  isOpen = signal<boolean>(false);
  searchTerm = signal<string>('');
  value = signal<any[]>([]); // Inicializado como Array
  disabled = signal<boolean>(false);


  onChange: any = () => { };
  onTouched: any = () => { };

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  // Dados filtrados no campo de pesquisa
  filteredData = computed(() => {
    const query = this.searchTerm().toLowerCase().trim();
    const items = this.data() || [];

    if (!query || this.onSearch) return items;

    return items.filter(item => {
      const labelValue = this.getItemLabel(item);
      return String(labelValue).toLowerCase().includes(query);
    });
  });

  // Retorna os objetos completos correspondentes aos valores selecionados para gerar os chips
  selectedOptions = computed(() => {
    const items = this.data() || [];
    const currentValues = this.value() || [];
    return items.filter(item => currentValues.includes(this.getItemValue(item)));
  });

  get triggerClasses(): string {
    return [
      `av-multi-select__trigger--${this.ringColor}`,
      this.isOpen() ? 'av-multi-select__trigger--open' : '',
      this.disabled() ? 'av-multi-select__trigger--disabled' : '',
      this.isInvalid ? 'av-multi-select__trigger--invalid' : '',
    ].filter(Boolean).join(' ');
  }

  get panelClasses(): string {
    return ['av-multi-select__panel', `av-multi-select__panel--${this.ringColor}`].join(' ');
  }

  get isInvalid(): boolean {
    return !!(this.ngControl && this.ngControl.invalid && (this.ngControl.dirty || this.ngControl.touched));
  }

  getItemLabel(item: any): string {
    return typeof item === 'object' && item !== null ? item[this.labelKey] : item;
  }

  getItemValue(item: any): any {
    return typeof item === 'object' && item !== null ? item[this.valueKey] : item;
  }

  isSelected(item: any): boolean {
    const val = this.getItemValue(item);
    return (this.value() || []).includes(val);
  }

  optionClasses(item: any): string {
    return [
      'av-multi-select__option',
      this.isSelected(item) ? 'av-multi-select__option--selected' : '',
    ].filter(Boolean).join(' ');
  }

  checkboxClasses(item: any): string {
    return [
      'av-multi-select__option-check',
      this.isSelected(item) ? 'av-multi-select__option-check--selected' : '',
    ].filter(Boolean).join(' ');
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

  // Adiciona ou remove o valor da lista (Toggle)
  toggleOption(item: any): void {
    const val = this.getItemValue(item);
    const currentValues = [...(this.value() || [])];
    const index = currentValues.indexOf(val);

    if (index > -1) {
      currentValues.splice(index, 1);
    } else {
      currentValues.push(val);
    }

    this.value.set(currentValues);
    this.onChange(currentValues);
  }

  // Remove o chip diretamente pelo botão "X"
  removeOption(event: MouseEvent, item: any): void {
    event.stopPropagation(); // Evita abrir/fechar o dropdown ao clicar no X
    this.toggleOption(item);
  }

  handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchTerm.set(query);

    if (this.onSearch) {
      this.onSearch(query);
    }
  }

  // ControlValueAccessor API
  writeValue(value: any[]): void {
    this.value.set(Array.isArray(value) ? value : []);
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

import { Component, ChangeDetectionStrategy, inject, OnInit, effect, untracked, signal, TemplateRef, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogComponent {
  dialogService = inject(DialogService);
  state = this.dialogService.state;

  /** Holds one value per control, indexed by position */
  controlValues = signal<string[]>([]);

  /** Dynamic options per control (used when searchFn is present) */
  dynamicOptions = signal<{ label: string, value: any }[][]>([]);

  /** Search text per control */
  searchTexts = signal<string[]>([]);

  private debounceTimers: (ReturnType<typeof setTimeout> | null)[] = [];

  constructor() {
    effect(() => {
      const s = this.state();
      if (s.isOpen && s.type === 'prompt') {
        untracked(() => {
          const controls = s.controls ?? [];
          // Initialise each control with its initialValue (or '')
          const initial = controls.map(c => c.initialValue ?? '');
          this.controlValues.set(initial);
          // Initialise dynamic options with static options (or [])
          this.dynamicOptions.set(controls.map(c => c.options ?? []));
          // Initialise search texts
          this.searchTexts.set(controls.map(() => ''));
          // Clear debounce timers
          this.debounceTimers = controls.map(() => null);
        });
      }
    });
  }

  /** Update the value of a specific control by index */
  onControlChange(index: number, value: string) {
    const values = [...this.controlValues()];
    values[index] = value;
    this.controlValues.set(values);
  }

  /** Called when the search input changes for a searchable select */
  onSearchChange(index: number, text: string) {
    const texts = [...this.searchTexts()];
    texts[index] = text;
    this.searchTexts.set(texts);

    const timer = this.debounceTimers[index];
    if (timer) clearTimeout(timer);

    const control = (this.state().controls ?? [])[index];
    if (!control?.searchFn) return;

    const searchFn = control.searchFn;
    this.debounceTimers[index] = setTimeout(async () => {
      const results = await searchFn(text, this.controlValues());
      const opts = [...this.dynamicOptions()];
      opts[index] = results;
      this.dynamicOptions.set(opts);

      // Auto-select if only 1 result returned
      const values = [...this.controlValues()];
      values[index] = results.length === 1 ? results[0].value : '';
      this.controlValues.set(values);
    }, 300);
  }

  isTemplate(content: TemplateRef<any> | Type<any>): content is TemplateRef<any> {
    return content instanceof TemplateRef;
  }

  getComponent(content: TemplateRef<any> | Type<any>): Type<any> {
    return content as Type<any>;
  }

  confirm() {
    const current = this.state();
    if (current.type === 'prompt') {
      const values = this.controlValues();
      const result = values.length === 1 ? values[0] : values;
      this.dialogService.close(result);
      this.controlValues.set([]);
      this.dynamicOptions.set([]);
      this.searchTexts.set([]);
    } else {
      this.dialogService.close(true);
    }
  }

  cancel() {
    const current = this.state();
    if (current.type === 'prompt') {
      this.dialogService.close(false);
      this.controlValues.set([]);
      this.dynamicOptions.set([]);
      this.searchTexts.set([]);
    } else {
      this.dialogService.close(false);
    }
  }
}

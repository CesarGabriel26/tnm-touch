import { Injectable, signal, TemplateRef, Type } from '@angular/core';

export interface DialogControl {
  label?: string;
  inputPlaceholder?: string;
  initialValue?: any;
  inputType?: 'text' | 'time' | 'number' | 'password' | 'select' | 'datetime-local' | 'radio-group';
  options?: { label: string, value: any }[];
  step?: number;
  searchFn?: (search: string, context: any) => Promise<{ label: string, value: any }[]>;
}

export interface DialogOptions {
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  confirmText?: string;
  cancelText?: string;
  controls?: DialogControl[];
  component?: Type<any> | TemplateRef<any>;
  componentData?: any;
}

interface DialogState extends DialogOptions {
  isOpen: boolean;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private defaultState: DialogState = {
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    confirmText: 'OK',
    cancelText: 'Cancelar'
  };

  readonly state = signal<DialogState>(this.defaultState);

  async alert(title: string, message: string, confirmText = 'OK'): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title,
        message,
        type: 'alert',
        confirmText,
        resolve,
      });
    });
  }

  async confirm(title: string, message: string, confirmText = 'Confirmar', cancelText = 'Cancelar'): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        resolve,
      });
    });
  }

  async prompt(
    title: string,
    message: string,
    controls: DialogControl[],
    confirmText = 'OK',
    cancelText = 'Cancelar'
  ): Promise<any> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        controls,
        confirmText,
        cancelText,
        resolve,
      });
    });
  }

  async showComponent(
    component: any,
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.state.set({
        isOpen: true,
        title: '',
        message: '',
        type: 'prompt',
        component,
        resolve,
        reject,
        componentData: data
      });
    });
  }

  async select(
    title: string,
    message: string,
    options: { label: string, value: any }[],
    initialValue: string = '',
    confirmText = 'OK',
    cancelText = 'Cancelar'
  ): Promise<string | null> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        title,
        message,
        type: 'prompt',
        controls: [
          {
            inputType: 'select',
            options,
            initialValue,
          }
        ],
        confirmText,
        cancelText,
        resolve,
      });
    });
  }

  close(result?: any) {
    const currentState = this.state();
    if (currentState.resolve) {
      currentState.resolve(result);
    }

    // reset carefully
    this.state.set({
      ...this.defaultState,
    });
  }
}

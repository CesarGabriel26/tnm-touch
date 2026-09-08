import { Injectable, signal } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  db = signal<Dexie | null>(null)

  constructor() {
    this.init()
  }

  async init() {
    this.db.set(
      new Dexie('pdv-touch')
      // as Dexie & {
      //   todoLists: EntityTable<TodoList, 'id'>;
      //   todoItems: EntityTable<TodoItem, 'id'>;
      // };
    );
    //TODO: definir tabelas
    // this.db()?.version(1).stores({

    // });
    await this.db()?.open();
  }
}

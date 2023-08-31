// Copyright (c) 2023-present Vadim Glinka
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option.

import {
  StorageInterface,
  type Setup,
  defaultStorageName,
  Ok,
} from 'storage-facade';

export const defaultUseCache = false;
export const defaultAsyncMode = false;

export class SessionStorageInterface extends StorageInterface {
  interfaceName = 'SessionStorageInterface';

  storageName = '';

  keysArrayName = '';

  useCache: boolean = defaultUseCache;

  asyncMode: boolean = defaultAsyncMode;

  keysArrayCache: string[] = [];

  keyValueCache = new Map<string, unknown>();

  isDeleted = false;

  getKeysArray(): string[] {
    const keysStr = window.sessionStorage.getItem(this.keysArrayName);
    if (keysStr === null) {
      const err = this.interfaceError(
        `'${this.keysArrayName}' not found.`
      );
      throw err;
    }
    const keys = JSON.parse(keysStr) as string[];
    if (this.useCache) this.keysArrayCache = keys;
    return keys;
  }

  defaultAsyncMode(): boolean {
    return this.asyncMode;
  }

  initSync<T extends StorageInterface>(setup: Setup<T>): Error | Ok {
    this.storageName = setup.name ?? defaultStorageName;
    this.useCache = (setup.useCache as boolean) ?? defaultUseCache;
    this.keysArrayName = `__${this.storageName}-keys-array`;
    try {
      const keysStr = window.sessionStorage.getItem(
        this.keysArrayName
      );
      const isKeysArrayInStorage = keysStr !== null;
      if (!isKeysArrayInStorage) {
        // Create keysArray in storage
        window.sessionStorage.setItem(
          this.keysArrayName,
          JSON.stringify([])
        );
      }
      if (isKeysArrayInStorage && this.useCache) {
        const keysArray = JSON.parse(keysStr) as string[];
        // Load keysArray to cache
        this.keysArrayCache = keysArray;
      }
      return new Ok();
    } catch (e) {
      return e as Error;
    }
  }

  checkStorage(): void {
    if (this.isDeleted) throw Error('This Storage was deleted!');
  }

  keyName(key: string): string {
    return `${this.storageName}-${key}`;
  }

  getItemSync(key: string): unknown {
    this.checkStorage();
    if (this.useCache && this.keyValueCache.has(key)) {
      return structuredClone(this.keyValueCache.get(key));
    }
    const valueStr = window.sessionStorage.getItem(this.keyName(key));
    if (valueStr === null || valueStr === 'undefined') {
      return undefined;
    }
    if (valueStr === 'null') {
      return null;
    }
    const value = JSON.parse(valueStr) as unknown;
    // Update keyValue cache
    if (this.useCache)
      this.keyValueCache.set(key, structuredClone(value));
    return value;
  }

  setItemSync(key: string, value: unknown): void {
    this.checkStorage();
    if (key === this.keysArrayName) {
      const err = this.interfaceError(`key '${key}' cannot be used.`);
      throw err;
    }
    const keysArray = this.useCache
      ? this.keysArrayCache
      : this.getKeysArray();
    if (!keysArray.includes(key)) {
      keysArray.push(key);
      // Update keys array in storage
      window.sessionStorage.setItem(
        this.keysArrayName,
        JSON.stringify(keysArray)
      );
      // Update keysArray cache
      if (this.useCache) this.keysArrayCache = keysArray;
    }
    // Update storage
    window.sessionStorage.setItem(
      this.keyName(key),
      JSON.stringify(value)
    );
    // Update keyValue cache
    if (this.useCache) {
      this.keyValueCache.set(key, structuredClone(value));
    }
  }

  removeItemSync(key: string): void {
    this.checkStorage();
    const keysArray = this.useCache
      ? this.keysArrayCache
      : this.getKeysArray();
    const updatedKeysArray = keysArray //
      .filter((savedKey) => savedKey !== key);
    // Update keys array in storage
    window.sessionStorage.setItem(
      this.keysArrayName,
      JSON.stringify(updatedKeysArray)
    );
    // Delete key from storage
    window.sessionStorage.removeItem(this.keyName(key));
    // Update cache
    if (this.useCache) {
      this.keyValueCache.delete(key);
      this.keysArrayCache = updatedKeysArray;
    }
  }

  clearSync(): void {
    this.checkStorage();
    const keysArray = this.useCache
      ? this.keysArrayCache
      : this.getKeysArray();
    // Update storage
    keysArray.forEach((key) => {
      window.sessionStorage.removeItem(this.keyName(key));
    });
    // Update keys array
    window.sessionStorage.setItem(
      this.keysArrayName,
      JSON.stringify([])
    );
    // Update cache
    if (this.useCache) {
      this.keyValueCache.clear();
      this.keysArrayCache = [];
    }
  }

  sizeSync(): number {
    this.checkStorage();
    const keysArray = this.useCache
      ? this.keysArrayCache
      : this.getKeysArray();
    return keysArray.length;
  }

  keySync(index: number): string | undefined {
    this.checkStorage();
    const keysArray = this.useCache
      ? this.keysArrayCache
      : this.getKeysArray();
    return keysArray[index];
  }

  deleteStorageSync(): void {
    this.checkStorage();
    this.clearSync();
    window.sessionStorage.removeItem(this.keysArrayName);
    this.isDeleted = true;
  }
}

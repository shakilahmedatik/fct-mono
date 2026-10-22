/**
 * Mock DOM & Browser Environment Emulator
 * Provides deterministic emulation of Window, Document, LocalStorage,
 * StorageEvent, MatchMedia, and multi-tab synchronization for Bun testing.
 */

export class MockLocalStorage implements Storage {
  private store = new Map<string, string>();
  public shouldThrowOnGet = false;
  public shouldThrowOnSet = false;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) {
      throw new DOMException("The operation is insecure / access denied", "SecurityError");
    }
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    }
    this.store.set(key, String(value));
  }

  // Debug helper to inspect raw store
  dump(): Record<string, string> {
    return Object.fromEntries(this.store.entries());
  }
}

export class MockClassList {
  private classes = new Set<string>();

  constructor(initial: string[] = []) {
    for (const c of initial) {
      if (c) this.classes.add(c);
    }
  }

  add(...tokens: string[]): void {
    for (const token of tokens) {
      if (token) this.classes.add(token);
    }
  }

  remove(...tokens: string[]): void {
    for (const token of tokens) {
      this.classes.delete(token);
    }
  }

  contains(token: string): boolean {
    return this.classes.has(token);
  }

  toggle(token: string, force?: boolean): boolean {
    if (force !== undefined) {
      if (force) this.add(token);
      else this.remove(token);
      return force;
    }
    if (this.contains(token)) {
      this.remove(token);
      return false;
    }
    this.add(token);
    return true;
  }

  toString(): string {
    return Array.from(this.classes).join(" ");
  }
}

export class MockDocumentElement {
  public classList = new MockClassList();
  public style: { colorScheme?: string; [key: string]: any } = {};
  public attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

export class MockMediaQueryList {
  public media: string;
  public matches: boolean;
  private listeners = new Set<EventListenerOrEventListenerObject>();

  constructor(media: string, matches = false) {
    this.media = media;
    this.matches = matches;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "change") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "change") {
      this.listeners.delete(listener);
    }
  }

  // Trigger change
  setMatches(matches: boolean): void {
    if (this.matches !== matches) {
      this.matches = matches;
      const event = { matches, media: this.media };
      for (const l of this.listeners) {
        if (typeof l === "function") {
          l(event as any);
        } else if (l && typeof l.handleEvent === "function") {
          l.handleEvent(event as any);
        }
      }
    }
  }
}

export interface EmulatedTab {
  window: any;
  document: any;
  localStorage: MockLocalStorage;
  mediaQueryDark: MockMediaQueryList;
  setSystemDarkMode(enabled: boolean): void;
}

/**
 * Creates an isolated or multi-tab simulated browser DOM context
 */
export function createBrowserContext(sharedStorage?: MockLocalStorage): EmulatedTab {
  const localStorage = sharedStorage ?? new MockLocalStorage();
  const documentElement = new MockDocumentElement();
  const mediaQueryDark = new MockMediaQueryList("(prefers-color-scheme: dark)", false);

  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  const addEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type)!.add(listener);
  };

  const removeEventListener = (type: string, listener: EventListenerOrEventListenerObject) => {
    listeners.get(type)?.delete(listener);
  };

  const dispatchEvent = (event: any): boolean => {
    const set = listeners.get(event.type);
    if (!set) return true;
    for (const l of set) {
      if (typeof l === "function") {
        l(event);
      } else if (l && typeof l.handleEvent === "function") {
        l.handleEvent(event);
      }
    }
    return true;
  };

  const doc = {
    documentElement,
    addEventListener,
    removeEventListener,
    dispatchEvent,
    createElement: (tag: string) => ({
      tagName: tag.toUpperCase(),
      classList: new MockClassList(),
      style: {},
      attributes: new Map<string, string>(),
      setAttribute(k: string, v: string) {
        this.attributes.set(k, v);
      },
      getAttribute(k: string) {
        return this.attributes.get(k) ?? null;
      },
    }),
  };

  const win = {
    localStorage,
    document: doc,
    addEventListener,
    removeEventListener,
    dispatchEvent,
    matchMedia: (query: string) => {
      if (query.includes("prefers-color-scheme: dark")) {
        return mediaQueryDark;
      }
      return new MockMediaQueryList(query, false);
    },
    innerWidth: 1280,
    innerHeight: 800,
  };

  return {
    window: win,
    document: doc,
    localStorage,
    mediaQueryDark,
    setSystemDarkMode(enabled: boolean) {
      mediaQueryDark.setMatches(enabled);
    },
  };
}

let _activeGlobalContext: EmulatedTab | null = null;
const originalGlobals: Partial<Record<string, any>> = {};

/**
 * Installs the emulated browser environment onto globalThis
 */
export function setupDOM(customContext?: EmulatedTab): EmulatedTab {
  const ctx = customContext ?? createBrowserContext();
  _activeGlobalContext = ctx;

  if (typeof (globalThis as any).window !== "undefined") {
    originalGlobals.window = (globalThis as any).window;
  }
  if (typeof (globalThis as any).document !== "undefined") {
    originalGlobals.document = (globalThis as any).document;
  }
  if (typeof (globalThis as any).localStorage !== "undefined") {
    originalGlobals.localStorage = (globalThis as any).localStorage;
  }

  (globalThis as any).window = ctx.window;
  (globalThis as any).document = ctx.document;
  (globalThis as any).localStorage = ctx.localStorage;

  return ctx;
}

/**
 * Restores globalThis back to original state
 */
export function teardownDOM(): void {
  if (originalGlobals.window) {
    (globalThis as any).window = originalGlobals.window;
  } else {
    delete (globalThis as any).window;
  }

  if (originalGlobals.document) {
    (globalThis as any).document = originalGlobals.document;
  } else {
    delete (globalThis as any).document;
  }

  if (originalGlobals.localStorage) {
    (globalThis as any).localStorage = originalGlobals.localStorage;
  } else {
    delete (globalThis as any).localStorage;
  }

  _activeGlobalContext = null;
}

/**
 * Creates a two-tab simulation environment sharing the same underlying localStorage.
 * When one tab mutates storage, it fires a StorageEvent on the other tab.
 */
export function createMultiTabEnvironment(): {
  tabA: EmulatedTab;
  tabB: EmulatedTab;
  syncTabAtoTabB(key: string, newValue: string | null): void;
  syncTabBtoTabA(key: string, newValue: string | null): void;
} {
  const sharedStorage = new MockLocalStorage();
  const tabA = createBrowserContext(sharedStorage);
  const tabB = createBrowserContext(sharedStorage);

  const sync = (
    _sourceTab: EmulatedTab,
    destTab: EmulatedTab,
    key: string,
    newValue: string | null,
  ) => {
    const oldValue = sharedStorage.getItem(key);
    if (newValue === null) {
      sharedStorage.removeItem(key);
    } else {
      sharedStorage.setItem(key, newValue);
    }
    const storageEvent = {
      type: "storage",
      key,
      oldValue,
      newValue,
      storageArea: sharedStorage,
    };
    destTab.window.dispatchEvent(storageEvent);
  };

  return {
    tabA,
    tabB,
    syncTabAtoTabB(key: string, newValue: string | null) {
      sync(tabA, tabB, key, newValue);
    },
    syncTabBtoTabA(key: string, newValue: string | null) {
      sync(tabB, tabA, key, newValue);
    },
  };
}

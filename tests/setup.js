// vitest setup:提供浏览器 localStorage mock(测试环境无浏览器 API)
class MemoryStorage {
  constructor() {
    this._data = new Map()
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null
  }
  setItem(key, value) {
    this._data.set(key, String(value))
  }
  removeItem(key) {
    this._data.delete(key)
  }
  clear() {
    this._data.clear()
  }
  get length() {
    return this._data.size
  }
  key(i) {
    return Array.from(this._data.keys())[i] ?? null
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  const store = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: store,
    writable: true,
    configurable: true,
  })
}

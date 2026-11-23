// IndexedDB sederhana: kv, days, openItems, photos
const NAME = 'rutinin', VER = 2;
let dbp;

function open() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('openItems')) db.createObjectStore('openItems', { keyPath: 'caseId' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('uploads')) db.createObjectStore('uploads', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const db = {
  get: (store, key) => run(store, 'readonly', s => s.get(key)),
  put: (store, val, key) => run(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)),
  del: (store, key) => run(store, 'readwrite', s => s.delete(key)),
  all: store => run(store, 'readonly', s => s.getAll()),
  clear: store => run(store, 'readwrite', s => s.clear()),
};

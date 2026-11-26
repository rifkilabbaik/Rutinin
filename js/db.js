const NAMA = 'rutinin', VERSI = 1;
let dbp;

function buka() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(NAMA, VERSI);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('days')) db.createObjectStore('days', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function jalan(store, mode, fn) {
  const db = await buka();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const db = {
  get: (store, key) => jalan(store, 'readonly', s => s.get(key)),
  put: (store, val, key) => jalan(store, 'readwrite', s => key === undefined ? s.put(val) : s.put(val, key)),
  del: (store, key) => jalan(store, 'readwrite', s => s.delete(key)),
  clear: store => jalan(store, 'readwrite', s => s.clear())
};

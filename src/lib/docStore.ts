"use client";
// Document blobs for the current browser. Demo mode uses IndexedDB; signed-in mode also
// uploads to the Supabase `files` bucket when available (paths stay on the application).
import { supabase } from "./session";

const DB = "greenlight-docs";
const STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const keyOf = (appId: string, docKey: string) => `${appId}/${docKey}`;

export async function putDoc(appId: string, docKey: string, file: File): Promise<{ name: string; path: string }> {
  const buf = await file.arrayBuffer();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ name: file.name, type: file.type, buf }, keyOf(appId, docKey));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  let path = `idb:${appId}/${docKey}`;
  if (supabase) {
    const storagePath = `apps/${appId}/${docKey}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const { error } = await supabase.storage.from("files").upload(storagePath, file, { upsert: true, contentType: file.type || "application/octet-stream" });
    if (!error) path = storagePath;
  }
  return { name: file.name, path };
}

export async function getDocUrl(appId: string, docKey: string, path?: string): Promise<string | null> {
  if (path && !path.startsWith("idb:") && supabase) {
    const { data } = await supabase.storage.from("files").createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  const db = await openDb();
  const row = await new Promise<{ name: string; type: string; buf: ArrayBuffer } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(keyOf(appId, docKey));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!row) return null;
  return URL.createObjectURL(new Blob([row.buf], { type: row.type || "application/octet-stream" }));
}

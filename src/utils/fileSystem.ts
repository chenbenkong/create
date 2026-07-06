/**
 * File System Access API 封装
 *
 * 浏览器沙箱限制：网页不能直接写任意文件夹。但 Chromium 86+（Chrome/Edge）
 * 提供 File System Access API，用户通过 showDirectoryPicker() 授权一个目录后，
 * 网页可以读写该目录下的文件。
 *
 * 目录 handle 不能序列化到 localStorage，所以用 IndexedDB 持久化。
 * 每次会话开始时需要重新请求权限（queryPermission / requestPermission）。
 *
 * Firefox / Safari 不支持此 API，调用方需要做 feature detection 回退。
 */

const DB_NAME = 'atelier-fs';
const STORE_NAME = 'handles';
const KEY = 'download-dir';

/** 浏览器是否支持 File System Access API */
export function isFileSystemSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ============ IndexedDB 持久化 ============

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 保存目录 handle 到 IndexedDB */
export async function saveDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** 从 IndexedDB 读取已保存的目录 handle */
export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

/** 删除已保存的目录 handle */
export async function clearDirHandle(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* ignore */ }
}

// ============ 权限管理 ============

/** 检查目录 handle 是否仍有读写权限（不弹窗） */
export async function checkPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  if (!handle.queryPermission) return false;
  const result = await handle.queryPermission({ mode });
  return result === 'granted';
}

/** 请求目录 handle 的读写权限（可能弹窗） */
export async function requestPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite'
): Promise<boolean> {
  if (!handle.requestPermission) return false;
  const result = await handle.requestPermission({ mode });
  return result === 'granted';
}

/** 验证 handle 是否可用（权限 + 是否仍存在） */
export async function verifyHandle(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  const hasPerm = await checkPermission(handle);
  if (hasPerm) return true;
  // 尝试重新请求权限
  return await requestPermission(handle);
}

// ============ 目录选择 ============

/** 弹出目录选择器，返回用户选中的目录 handle */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemSupported()) return null;
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      id: 'atelier-downloads',
    });
    await saveDirHandle(handle);
    return handle;
  } catch {
    // 用户取消选择
    return null;
  }
}

// ============ 文件写入 ============

/**
 * 将 Blob 写入选定目录（不弹"另存为"对话框）
 * @returns 写入成功返回文件名，失败返回 null
 */
export async function writeToDirectory(
  handle: FileSystemDirectoryHandle,
  filename: string,
  data: Blob
): Promise<string | null> {
  try {
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    return filename;
  } catch {
    return null;
  }
}

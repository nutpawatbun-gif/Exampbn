/**
 * Centralized Real-time Sync Manager for MCU DrivePass
 * Synchronizes download quotas, per-file download counts, and expiration dates
 * seamlessly across different web browsers (Chrome, Edge, Safari, Mobile)
 * in both full-stack (Node.js) and static hosting (GitHub Pages) environments.
 */

const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1520f6e2311fa';
const BROADCAST_CHANNEL_NAME = 'mcu_share_sync_channel';

export interface SyncData {
  totalDownloads: number;
  fileDownloads: Record<string, number>;
  expiresAt?: string;
  updatedAt?: string;
}

// In-memory cache of latest known stats
let latestSyncedData: SyncData = {
  totalDownloads: 0,
  fileDownloads: {},
};

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment:', e);
}

/**
 * Fetch latest real-time stats from Node server API or Cloud Sync Fallback
 */
export async function fetchRealtimeStats(shareId: string = 'grade-sem1-2569'): Promise<SyncData | null> {
  // 1. Try local/backend server first
  try {
    const res = await fetch(`/api/shares/${shareId}/realtime`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success) {
        const result: SyncData = {
          totalDownloads: json.totalDownloadsCount ?? 0,
          fileDownloads: json.fileDownloads ?? {},
          expiresAt: json.expiresAt,
          updatedAt: new Date().toISOString(),
        };
        updateLatestCache(result);
        return result;
      }
    }
  } catch {
    // Backend not running (e.g. static hosting like GitHub Pages) -> proceed to cloud fallback
  }

  // 2. Cloud Fallback for Static Host Deployments (Cross-browser real-time sync)
  try {
    const cloudRes = await fetch(CLOUD_SYNC_URL, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (cloudRes.ok) {
      const cloudJson = await cloudRes.json();
      if (cloudJson && cloudJson.data) {
        const cData = cloudJson.data;
        const result: SyncData = {
          totalDownloads: typeof cData.totalDownloads === 'number' ? cData.totalDownloads : 0,
          fileDownloads: cData.fileDownloads && typeof cData.fileDownloads === 'object' ? cData.fileDownloads : {},
          expiresAt: cData.expiresAt,
          updatedAt: cData.updatedAt || new Date().toISOString(),
        };
        updateLatestCache(result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Cloud realtime sync fetch error:', err);
  }

  // 3. Fallback to LocalStorage if network is offline
  try {
    const localDownloads = localStorage.getItem(`mcu_downloads_${shareId}`);
    const localFiles = localStorage.getItem(`mcu_files_${shareId}`);
    const totalDownloads = localDownloads ? parseInt(localDownloads, 10) || 0 : 0;
    const fileDownloads: Record<string, number> = {};
    if (localFiles) {
      try {
        const arr = JSON.parse(localFiles);
        if (Array.isArray(arr)) {
          arr.forEach((item: any) => {
            if (item.id && typeof item.downloadCount === 'number') {
              fileDownloads[item.id] = item.downloadCount;
            }
          });
        }
      } catch {}
    }
    return { totalDownloads, fileDownloads };
  } catch {
    return null;
  }
}

/**
 * Record a download event and broadcast/sync to all clients and cloud
 */
export async function recordDownloadSync(
  shareId: string,
  newTotalDownloads: number,
  fileDownloads: Record<string, number>,
  expiresAt?: string
): Promise<void> {
  const payload: SyncData = {
    totalDownloads: newTotalDownloads,
    fileDownloads,
    expiresAt,
    updatedAt: new Date().toISOString(),
  };

  updateLatestCache(payload);

  // 1. Persist to LocalStorage for offline recovery
  try {
    localStorage.setItem(`mcu_downloads_${shareId}`, String(newTotalDownloads));
    localStorage.setItem(
      `mcu_files_${shareId}`,
      JSON.stringify(
        Object.entries(fileDownloads).map(([id, downloadCount]) => ({
          id,
          downloadCount,
          lastDownloadedAt: new Date().toISOString(),
        }))
      )
    );
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  // 2. Broadcast to other tabs on same device/browser via BroadcastChannel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'DOWNLOAD_UPDATED',
        shareId,
        data: payload,
      });
    }
  } catch {}

  // 3. Sync to Backend API if available
  try {
    fetch(`/api/shares/${shareId}/record-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 1 }),
    }).catch(() => {});
  } catch {}

  // 4. Sync to Cloud Object for other browsers/devices (Chrome <-> Edge <-> Mobile)
  try {
    fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `mcu_share_${shareId}`,
        data: payload,
      }),
    }).catch((err) => console.warn('Cloud sync update failed:', err));
  } catch (err) {
    console.warn('Cloud sync call error:', err);
  }
}

/**
 * Helper to update memory cache with highest known counts
 */
function updateLatestCache(incoming: SyncData) {
  if (incoming.totalDownloads > (latestSyncedData.totalDownloads || 0)) {
    latestSyncedData.totalDownloads = incoming.totalDownloads;
  }
  latestSyncedData.fileDownloads = {
    ...latestSyncedData.fileDownloads,
    ...incoming.fileDownloads,
  };
  if (incoming.expiresAt) {
    latestSyncedData.expiresAt = incoming.expiresAt;
  }
}

/**
 * Subscribe to real-time sync updates across tabs and browsers
 * Polls every 3.5 seconds and listens to BroadcastChannel
 */
export function subscribeRealtimeSync(
  shareId: string,
  onUpdate: (data: SyncData) => void
): () => void {
  let isSubscribed = true;

  // Broadcast channel listener (instant cross-tab on same browser)
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'DOWNLOAD_UPDATED' && event.data.shareId === shareId) {
      const data: SyncData = event.data.data;
      updateLatestCache(data);
      onUpdate(data);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // Polling interval (cross-browser / cross-device real-time sync)
  const poll = async () => {
    if (!isSubscribed) return;
    try {
      const latest = await fetchRealtimeStats(shareId);
      if (latest && isSubscribed) {
        onUpdate(latest);
      }
    } catch {}
  };

  // Immediate check on mount
  poll();

  // Recurring poll every 3.5 seconds
  const intervalId = setInterval(poll, 3500);

  // Return unsubscribe cleanup function
  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}

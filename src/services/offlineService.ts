const CACHE_NAME = 'quran-audio-cache-v1';

export interface DownloadStatus {
  surahNumber: number;
  reciterId: string;
  isDownloaded: boolean;
  isDownloading: boolean;
  progress: number;
}

export const offlineService = {
  async isDownloaded(_surahNumber: number, _reciterId: string, url: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  },

  async downloadSurah(
    _surahNumber: number,
    _reciterId: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      
      // Check if already downloaded
      const existing = await cache.match(url);
      if (existing) return true;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const chunks: BlobPart[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress && total > 0) {
          onProgress(Math.round((loaded / total) * 100));
        }
      }

      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const blob = new Blob(chunks, { type: contentType });
      const cacheResponse = new Response(blob, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(blob.size),
        },
      });
      
      await cache.put(url, cacheResponse);
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  },

  async getAllCachedUrls(): Promise<string[]> {
    if (typeof caches === 'undefined') return [];
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      return keys.map(request => request.url);
    } catch (error) {
      console.error('Error getting cached keys:', error);
      return [];
    }
  },

  async removeDownloadedSurah(url: string): Promise<boolean> {
    if (typeof caches === 'undefined') return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      return await cache.delete(url);
    } catch (error) {
      console.error('Error removing from cache:', error);
      return false;
    }
  },

  async getCachedAudioUrl(url: string): Promise<string | null> {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached audio:', error);
      return null;
    }
  }
};

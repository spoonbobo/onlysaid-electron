import { useState, useEffect, useCallback, useRef } from 'react';

interface AssetCache {
  [assetPath: string]: {
    dataUrl: string;
    timestamp: number;
    version?: string; // Add version for cache busting if needed
  };
}

interface FailedAssets {
  [assetPath: string]: {
    timestamp: number;
    attempts: number;
  };
}

// Much longer cache duration for app assets (they rarely change)
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FAILED_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes before retrying failed assets
const MAX_RETRY_ATTEMPTS = 3;

const assetCache: AssetCache = {};
const failedAssets: FailedAssets = {};

// Try to load from localStorage on app start
const loadCacheFromStorage = () => {
  try {
    const stored = localStorage.getItem('app-assets-cache');
    if (stored) {
      const parsedCache = JSON.parse(stored);
      Object.assign(assetCache, parsedCache);
    }
  } catch (error) {
    console.warn('Failed to load asset cache from localStorage:', error);
  }
};

// Save cache to localStorage
const saveCacheToStorage = () => {
  try {
    localStorage.setItem('app-assets-cache', JSON.stringify(assetCache));
  } catch (error) {
    console.warn('Failed to save asset cache to localStorage:', error);
  }
};

// Initialize cache from storage
loadCacheFromStorage();

export const useAppAssets = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  // Load cached assets into state on mount - only once
  useEffect(() => {
    const cachedAssets: Record<string, string> = {};
    const now = Date.now();
    
    Object.entries(assetCache).forEach(([assetPath, cached]) => {
      if ((now - cached.timestamp) < CACHE_DURATION) {
        cachedAssets[assetPath] = cached.dataUrl;
      }
    });
    
    if (Object.keys(cachedAssets).length > 0) {
      setAssets(cachedAssets);
    }
  }, []); // Empty dependency array - only run once

  const shouldRetryFailedAsset = (assetPath: string): boolean => {
    const failed = failedAssets[assetPath];
    if (!failed) return true;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - failed.timestamp;
    
    // Don't retry if we've exceeded max attempts and it's been less than retry delay
    if (failed.attempts >= MAX_RETRY_ATTEMPTS && timeSinceLastAttempt < FAILED_RETRY_DELAY) {
      return false;
    }
    
    return true;
  };

  const markAssetAsFailed = (assetPath: string) => {
    const now = Date.now();
    const existing = failedAssets[assetPath];
    
    failedAssets[assetPath] = {
      timestamp: now,
      attempts: existing ? existing.attempts + 1 : 1
    };
  };

  // Use useRef to prevent dependency loops
  const loadAsset = useCallback(async (assetPath: string, forceRefresh = false) => {
    // Prevent multiple simultaneous loads of the same asset
    const loadingKey = `${assetPath}-${forceRefresh}`;
    if (loadingRef.current) {
      console.log(`[useAppAssets] Already loading, skipping: ${assetPath}`);
      return null;
    }

    // Check if asset has failed recently and shouldn't be retried
    if (!forceRefresh && !shouldRetryFailedAsset(assetPath)) {
      console.warn(`Skipping retry for failed asset: ${assetPath}`);
      return null;
    }

    // Check cache first (skip cache if forceRefresh is true)
    const cached = assetCache[assetPath];
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.dataUrl;
    }

    try {
      loadingRef.current = true;
      console.log(`[useAppAssets] ${forceRefresh ? 'Force loading' : 'Loading'} asset: ${assetPath}`);
      const assetData = await window.electron.fileSystem.getLocalAsset(assetPath);
      
      if (assetData) {
        // Cache the result
        assetCache[assetPath] = {
          dataUrl: assetData.data,
          timestamp: now
        };
        
        // Remove from failed assets if it was there
        delete failedAssets[assetPath];
        
        // Persist to localStorage
        saveCacheToStorage();
        
        console.log(`[useAppAssets] Successfully ${forceRefresh ? 'force loaded' : 'loaded'} asset: ${assetPath}`);
        return assetData.data;
      }
    } catch (error) {
      console.error(`Failed to load asset ${assetPath}:`, error);
      markAssetAsFailed(assetPath);
    } finally {
      loadingRef.current = false;
    }
    
    return null;
  }, []);

  const getAsset = useCallback(async (assetPath: string, forceRefresh = false) => {
    // Check if already in state and not forcing refresh
    if (!forceRefresh && assets[assetPath]) {
      return assets[assetPath];
    }

    if (!forceRefresh && !shouldRetryFailedAsset(assetPath)) {
      return null;
    }

    setLoading(true);
    const assetUrl = await loadAsset(assetPath, forceRefresh);
    
    if (assetUrl) {
      setAssets(prev => ({
        ...prev,
        [assetPath]: assetUrl
      }));
    }
    
    setLoading(false);
    return assetUrl;
  }, [loadAsset]);

  const preloadAssets = useCallback(async (assetPaths: string[], forceRefresh = false) => {
    if (loadingRef.current) {
      console.log('[useAppAssets] Already loading assets, skipping preload');
      return;
    }

    setLoading(true);
    
    // If forceRefresh is true, clear cache for these specific assets
    if (forceRefresh) {
      assetPaths.forEach(assetPath => {
        delete assetCache[assetPath];
        delete failedAssets[assetPath];
      });
    }
    
    // Filter out assets that have failed recently (unless force refresh)
    const assetsToLoad = assetPaths.filter(assetPath => 
      forceRefresh || (!assets[assetPath] && shouldRetryFailedAsset(assetPath))
    );

    if (assetsToLoad.length === 0 && !forceRefresh) {
      setLoading(false);
      return;
    }
    
    const loadPromises = assetsToLoad.map(async (assetPath) => {
      const assetUrl = await loadAsset(assetPath, forceRefresh);
      return { assetPath, assetUrl };
    });

    const results = await Promise.all(loadPromises);
    const newAssets: Record<string, string> = { ...assets };
    
    results.forEach((result) => {
      if (result && result.assetUrl) {
        newAssets[result.assetPath] = result.assetUrl;
      }
    });
    
    setAssets(newAssets);
    setLoading(false);
  }, [loadAsset]);

  // Method to clear cache if needed (for development or updates)
  const clearCache = useCallback(() => {
    Object.keys(assetCache).forEach(key => delete assetCache[key]);
    Object.keys(failedAssets).forEach(key => delete failedAssets[key]);
    localStorage.removeItem('app-assets-cache');
    setAssets({});
  }, []);

  return {
    assets,
    loading,
    getAsset,
    preloadAssets,
    clearCache
  };
}; 
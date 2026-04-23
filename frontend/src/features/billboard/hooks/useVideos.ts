import { useReducer, useEffect, useCallback, useState } from 'react';
import type { Video, ApiResponse, SortOption, LangOption } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface UseVideosOptions {
  sort: SortOption;
  limit?: number;
  lang: LangOption;
}

interface UseVideosResult {
  videos: Video[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type FetchAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; videos: Video[] }
  | { type: 'FETCH_ERROR' };

type FetchState = {
  videos: Video[];
  loading: boolean;
  error: string | null;
};

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { videos: action.videos, loading: false, error: null };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: 'Failed to fetch videos' };
  }
}

export function useVideos({ sort, limit, lang }: UseVideosOptions): UseVideosResult {
  const [state, dispatch] = useReducer(fetchReducer, {
    videos: [],
    loading: true,
    error: null,
  });

  // Incrementing this counter is how we expose a manual refetch without
  // duplicating the fetch logic outside the effect.
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });

    const controller = new AbortController();
    const params = new URLSearchParams({ sort, lang });
    if (limit) params.set('limit', String(limit));

    fetch(`${API_BASE}/api/videos?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        dispatch({ type: 'FETCH_SUCCESS', videos: data.data });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        dispatch({ type: 'FETCH_ERROR' });
      });

    // Cancel in-flight request when deps change or component unmounts.
    return () => controller.abort();
  }, [sort, limit, lang, fetchCount]);

  const refetch = useCallback(() => setFetchCount((n) => n + 1), []);

  return { ...state, refetch };
}

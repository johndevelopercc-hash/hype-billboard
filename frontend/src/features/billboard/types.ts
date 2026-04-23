export interface Video {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  publishedAt: string;
  hypeLevel: number;
  isCrown: boolean;
}

export interface ApiResponse {
  data: Video[];
  meta: {
    timestamp: string;
    count: number;
  };
  status: 'success' | 'error';
}

export type SortOption = 'hype' | 'date';
export type LangOption = 'es' | 'en';

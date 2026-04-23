import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { GetVideosDto } from './dto/get-videos.dto';

export interface VideoItem {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  publishedAt: string;
  hypeLevel: number;
  isCrown: boolean;
}

interface RawVideo {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: { high: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount?: string;
  };
}

interface MockDataFile {
  items: RawVideo[];
}

@Injectable()
export class VideosService {
  // Read once at startup — avoids blocking the event loop on every request
  private readonly items: RawVideo[] = (
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'mock-youtube-api.json'),
        'utf-8',
      ),
    ) as MockDataFile
  ).items;

  calculateHype(
    likes: number,
    comments: number | null,
    views: number,
    title: string,
  ): number {
    if (comments === null) return 0;
    if (views === 0) return 0;

    const base = (likes + comments) / views;
    const isTutorial = /tutorial/i.test(title);

    return isTutorial ? base * 2 : base;
  }

  getRelativeDate(publishedAt: string, lang: 'es' | 'en'): string {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffMs = now.getTime() - published.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const labels =
      lang === 'es'
        ? {
            justNow: 'Hace un momento',
            day: (n: number) => (n === 1 ? 'Hace 1 día' : `Hace ${n} días`),
            week: (n: number) =>
              n === 1 ? 'Hace 1 semana' : `Hace ${n} semanas`,
            month: (n: number) => (n === 1 ? 'Hace 1 mes' : `Hace ${n} meses`),
            year: (n: number) => (n === 1 ? 'Hace 1 año' : `Hace ${n} años`),
          }
        : {
            justNow: 'Just now',
            day: (n: number) => (n === 1 ? '1 day ago' : `${n} days ago`),
            week: (n: number) => (n === 1 ? '1 week ago' : `${n} weeks ago`),
            month: (n: number) => (n === 1 ? '1 month ago' : `${n} months ago`),
            year: (n: number) => (n === 1 ? '1 year ago' : `${n} years ago`),
          };

    if (diffDays < 1) return labels.justNow;
    if (diffDays < 7) return labels.day(diffDays);
    if (diffDays < 30) return labels.week(Math.floor(diffDays / 7));
    if (diffDays < 365) return labels.month(Math.floor(diffDays / 30));
    return labels.year(Math.floor(diffDays / 365));
  }

  getVideos(dto: GetVideosDto): VideoItem[] {
    const { sort = 'hype', limit, lang = 'es' } = dto;

    const videos: VideoItem[] = this.items.map((item) => {
      const likes = parseInt(item.statistics.likeCount, 10) || 0;
      const views = parseInt(item.statistics.viewCount, 10) || 0;
      const comments =
        item.statistics.commentCount !== undefined
          ? parseInt(item.statistics.commentCount, 10)
          : null;

      return {
        id: item.id,
        title: item.snippet.title,
        author: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high.url,
        publishedAt: this.getRelativeDate(item.snippet.publishedAt, lang),
        hypeLevel:
          Math.round(
            this.calculateHype(likes, comments, views, item.snippet.title) *
              10000,
          ) / 10000,
        isCrown: false,
      };
    });

    // Mark crown on the full dataset BEFORE sort and slice.
    // This ensures isCrown reflects the global max hype, not the local max
    // of a limited/sorted subset.
    const maxHype = Math.max(...videos.map((v) => v.hypeLevel));
    const crownIdx = videos.findIndex((v) => v.hypeLevel === maxHype);
    if (crownIdx !== -1) videos[crownIdx].isCrown = true;

    // Pre-build a date lookup Map to avoid O(n²·log n) from calling
    // .find() inside the sort comparator on every comparison.
    const dateMap = new Map<string, number>(
      this.items.map((i) => [i.id, new Date(i.snippet.publishedAt).getTime()]),
    );

    videos.sort((a, b) =>
      sort === 'date'
        ? dateMap.get(b.id)! - dateMap.get(a.id)!
        : b.hypeLevel - a.hypeLevel,
    );

    // Known tradeoff: with sort='date' + a small limit, the Crown Jewel
    // may fall outside the window and be absent from the response.
    // The frontend handles this gracefully — no isCrown card is shown.
    // Documented in DECISIONS.md.
    return limit ? videos.slice(0, limit) : videos;
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from '../videos.service';

describe('VideosService', () => {
  let service: VideosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideosService],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  // ─── Business rule: disabled comments → Hype = 0 ────────────────────────────
  describe('Rule: videos with disabled comments have Hype = 0', () => {
    it('returns 0 when commentCount is absent from the payload', () => {
      expect(service.calculateHype(50000, null, 1000000, 'Great video')).toBe(
        0,
      );
    });

    it('still returns 0 even if the video has many likes', () => {
      expect(service.calculateHype(999999, null, 1000000, 'Viral video')).toBe(
        0,
      );
    });
  });

  // ─── Business rule: zero views → Hype = 0 (avoid division by zero) ──────────
  describe('Rule: videos with zero views have Hype = 0', () => {
    it('returns 0 when viewCount is 0 — avoids NaN from division by zero', () => {
      expect(service.calculateHype(0, 0, 0, 'Brand new stream')).toBe(0);
    });

    it('returns 0 even if the video somehow has likes but no views', () => {
      expect(service.calculateHype(100, 10, 0, 'Ghost video')).toBe(0);
    });
  });

  // ─── Business rule: Tutorial modifier doubles the hype ───────────────────────
  describe('Rule: title containing "tutorial" (any case) doubles the Hype score', () => {
    const likes = 1000;
    const comments = 100;
    const views = 10000;
    const baseHype = (likes + comments) / views; // 0.11

    it('doubles hype for exact casing "Tutorial"', () => {
      const result = service.calculateHype(
        likes,
        comments,
        views,
        'React - Tutorial',
      );
      expect(result).toBeCloseTo(baseHype * 2, 5);
    });

    it('doubles hype for lowercase "tutorial"', () => {
      const result = service.calculateHype(
        likes,
        comments,
        views,
        'React en 10 minutos - tutorial',
      );
      expect(result).toBeCloseTo(baseHype * 2, 5);
    });

    it('doubles hype for mixed case "TuToRiaL" (real case from mock data)', () => {
      const result = service.calculateHype(
        likes,
        comments,
        views,
        'React avanzado - TuToRiaL',
      );
      expect(result).toBeCloseTo(baseHype * 2, 5);
    });

    it('doubles hype for "tUtOriAl" (another real case from mock data)', () => {
      const result = service.calculateHype(
        likes,
        comments,
        views,
        'TypeScript tips - tUtOriAl',
      );
      expect(result).toBeCloseTo(baseHype * 2, 5);
    });

    it('does NOT double hype when the title has no tutorial keyword', () => {
      const result = service.calculateHype(
        likes,
        comments,
        views,
        'Next.js tips',
      );
      expect(result).toBeCloseTo(baseHype, 5);
    });
  });

  // ─── Business rule: base formula is (likes + comments) / views ──────────────
  describe('Rule: base Hype = (likes + comments) / views', () => {
    it('calculates hype correctly for a real video from the dataset (vid_001)', () => {
      // AWS explicado fácil: 3203 likes, 128 comments, 64076 views → ~0.052
      const result = service.calculateHype(
        3203,
        128,
        64076,
        'AWS explicado fácil',
      );
      expect(result).toBeCloseTo(0.052, 2);
    });

    it('a video with higher engagement relative to views scores higher hype', () => {
      const highEngagement = service.calculateHype(5000, 500, 10000, 'Video A');
      const lowEngagement = service.calculateHype(100, 10, 10000, 'Video B');
      expect(highEngagement).toBeGreaterThan(lowEngagement);
    });
  });

  // ─── Business rule: date transformation — no external libraries ──────────────
  describe('Rule: relative dates use native JS only, in Spanish and English', () => {
    it('returns "Hace un momento" / "Just now" for very recent videos', () => {
      const now = new Date().toISOString();
      expect(service.getRelativeDate(now, 'es')).toBe('Hace un momento');
      expect(service.getRelativeDate(now, 'en')).toBe('Just now');
    });

    it('returns singular day form correctly ("Hace 1 día")', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(service.getRelativeDate(yesterday.toISOString(), 'es')).toBe(
        'Hace 1 día',
      );
      expect(service.getRelativeDate(yesterday.toISOString(), 'en')).toBe(
        '1 day ago',
      );
    });

    it('returns plural days form ("Hace 5 días")', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      expect(service.getRelativeDate(fiveDaysAgo.toISOString(), 'es')).toBe(
        'Hace 5 días',
      );
      expect(service.getRelativeDate(fiveDaysAgo.toISOString(), 'en')).toBe(
        '5 days ago',
      );
    });

    it('returns weeks for dates between 7 and 29 days ago', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(service.getRelativeDate(twoWeeksAgo.toISOString(), 'es')).toBe(
        'Hace 2 semanas',
      );
      expect(service.getRelativeDate(twoWeeksAgo.toISOString(), 'en')).toBe(
        '2 weeks ago',
      );
    });

    it('returns months for dates between 30 and 364 days ago', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 61);
      expect(service.getRelativeDate(twoMonthsAgo.toISOString(), 'es')).toBe(
        'Hace 2 meses',
      );
      expect(service.getRelativeDate(twoMonthsAgo.toISOString(), 'en')).toBe(
        '2 months ago',
      );
    });

    it('returns years for dates over 365 days ago', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      expect(service.getRelativeDate(twoYearsAgo.toISOString(), 'es')).toBe(
        'Hace 2 años',
      );
      expect(service.getRelativeDate(twoYearsAgo.toISOString(), 'en')).toBe(
        '2 years ago',
      );
    });
  });

  // ─── Business rule: crown jewel selection ────────────────────────────────────
  describe('Rule: exactly one video is the Crown Jewel — the one with highest Hype', () => {
    it('marks exactly one video as isCrown across all 50 items', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      const crownVideos = videos.filter((v) => v.isCrown);
      expect(crownVideos).toHaveLength(1);
    });

    it('the crown video has the highest hype score in the entire dataset', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      const crown = videos.find((v) => v.isCrown)!;
      const maxHype = Math.max(...videos.map((v) => v.hypeLevel));
      expect(crown.hypeLevel).toBe(maxHype);
    });

    it('vid_012 (no commentCount) has hype = 0 and is NOT the crown', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      const vid = videos.find((v) => v.id === 'vid_012')!;
      expect(vid.hypeLevel).toBe(0);
      expect(vid.isCrown).toBe(false);
    });

    it('vid_045 (no commentCount) has hype = 0 and is NOT the crown', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      const vid = videos.find((v) => v.id === 'vid_045')!;
      expect(vid.hypeLevel).toBe(0);
      expect(vid.isCrown).toBe(false);
    });
  });

  // ─── Business rule: query params are respected ───────────────────────────────
  describe('Rule: limit and sort query params shape the response', () => {
    it('returns exactly the requested number of videos when limit is set', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es', limit: 10 });
      expect(videos).toHaveLength(10);
    });

    it('returns videos sorted by hype descending (highest first)', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      for (let i = 0; i < videos.length - 1; i++) {
        expect(videos[i].hypeLevel).toBeGreaterThanOrEqual(
          videos[i + 1].hypeLevel,
        );
      }
    });

    it('returns all 50 videos when no limit is specified', () => {
      const videos = service.getVideos({ sort: 'hype', lang: 'es' });
      expect(videos).toHaveLength(50);
    });

    it('each video in the response has all required fields for the frontend', () => {
      const [video] = service.getVideos({ sort: 'hype', lang: 'es' });
      expect(video).toHaveProperty('id');
      expect(video).toHaveProperty('title');
      expect(video).toHaveProperty('author');
      expect(video).toHaveProperty('thumbnail');
      expect(video).toHaveProperty('publishedAt');
      expect(video).toHaveProperty('hypeLevel');
      expect(video).toHaveProperty('isCrown');
    });

    // Known tradeoff: crown is marked on the full dataset before sort/slice.
    // With sort='date' + a small limit, the crown may fall outside the window.
    it('crown is always the global max-hype video even when sort=date', () => {
      const all = service.getVideos({ sort: 'hype', lang: 'es' });
      const globalCrown = all.find((v) => v.isCrown)!;

      const byDate = service.getVideos({ sort: 'date', lang: 'es' });
      const crownInDateSort = byDate.find((v) => v.isCrown);

      // The crown video is always identified correctly regardless of sort
      expect(crownInDateSort?.id).toBe(globalCrown.id);
    });

    it('with sort=date + small limit the crown may be absent from the response — documented tradeoff', () => {
      // Get the crown position in date-sorted order
      const byDate = service.getVideos({ sort: 'date', lang: 'es' });
      const crownPosition = byDate.findIndex((v) => v.isCrown);

      if (crownPosition >= 3) {
        // Crown is outside a limit=3 window — response has no crown
        const limited = service.getVideos({
          sort: 'date',
          lang: 'es',
          limit: 3,
        });
        const hasCrown = limited.some((v) => v.isCrown);
        expect(hasCrown).toBe(false);
      } else {
        // Crown happens to be in the top 3 by date — response includes it
        const limited = service.getVideos({
          sort: 'date',
          lang: 'es',
          limit: 3,
        });
        const hasCrown = limited.some((v) => v.isCrown);
        expect(hasCrown).toBe(true);
      }
    });
  });
});

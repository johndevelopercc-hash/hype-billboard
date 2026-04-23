import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Hype Billboard API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ok');
          expect(res.body.data).toHaveProperty('uptime');
          expect(res.body.status).toBe('success');
        });
    });
  });

  describe('GET /api/videos', () => {
    it('should return 200 with video list', () => {
      return request(app.getHttpServer())
        .get('/api/videos')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('success');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.meta.count).toBe(50);
        });
    });

    it('should return videos with required fields', () => {
      return request(app.getHttpServer())
        .get('/api/videos')
        .expect(200)
        .expect((res) => {
          const video = res.body.data[0];
          expect(video).toHaveProperty('id');
          expect(video).toHaveProperty('title');
          expect(video).toHaveProperty('author');
          expect(video).toHaveProperty('thumbnail');
          expect(video).toHaveProperty('publishedAt');
          expect(video).toHaveProperty('hypeLevel');
          expect(video).toHaveProperty('isCrown');
        });
    });

    it('should mark exactly one video as crown', () => {
      return request(app.getHttpServer())
        .get('/api/videos')
        .expect(200)
        .expect((res) => {
          const crownVideos = res.body.data.filter((v: { isCrown: boolean }) => v.isCrown);
          expect(crownVideos).toHaveLength(1);
        });
    });

    it('should respect the limit query param', () => {
      return request(app.getHttpServer())
        .get('/api/videos?limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(10);
          expect(res.body.meta.count).toBe(10);
        });
    });

    it('should return english dates with lang=en', () => {
      return request(app.getHttpServer())
        .get('/api/videos?lang=en')
        .expect(200)
        .expect((res) => {
          const dates: string[] = res.body.data.map((v: { publishedAt: string }) => v.publishedAt);
          const hasSpanish = dates.some((d) => d.startsWith('Hace'));
          expect(hasSpanish).toBe(false);
        });
    });

    it('should return 400 for invalid sort param', () => {
      return request(app.getHttpServer())
        .get('/api/videos?sort=invalid')
        .expect(400);
    });

    it('should return 400 for invalid lang param', () => {
      return request(app.getHttpServer())
        .get('/api/videos?lang=fr')
        .expect(400);
    });

    it('should return 400 for limit out of range', () => {
      return request(app.getHttpServer())
        .get('/api/videos?limit=100')
        .expect(400);
    });

    it('should sort by hype descending by default', () => {
      return request(app.getHttpServer())
        .get('/api/videos?sort=hype')
        .expect(200)
        .expect((res) => {
          const hypes: number[] = res.body.data.map((v: { hypeLevel: number }) => v.hypeLevel);
          for (let i = 0; i < hypes.length - 1; i++) {
            expect(hypes[i]).toBeGreaterThanOrEqual(hypes[i + 1]);
          }
        });
    });
  });
});

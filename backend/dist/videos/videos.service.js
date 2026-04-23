"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let VideosService = class VideosService {
    dataPath = path.join(process.cwd(), 'mock-youtube-api.json');
    calculateHype(likes, comments, views, title) {
        if (comments === null)
            return 0;
        if (views === 0)
            return 0;
        const base = (likes + comments) / views;
        const isTutorial = /tutorial/i.test(title);
        return isTutorial ? base * 2 : base;
    }
    getRelativeDate(publishedAt, lang) {
        const now = new Date();
        const published = new Date(publishedAt);
        const diffMs = now.getTime() - published.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const labels = lang === 'es'
            ? {
                justNow: 'Hace un momento',
                day: (n) => (n === 1 ? 'Hace 1 día' : `Hace ${n} días`),
                week: (n) => n === 1 ? 'Hace 1 semana' : `Hace ${n} semanas`,
                month: (n) => n === 1 ? 'Hace 1 mes' : `Hace ${n} meses`,
                year: (n) => (n === 1 ? 'Hace 1 año' : `Hace ${n} años`),
            }
            : {
                justNow: 'Just now',
                day: (n) => (n === 1 ? '1 day ago' : `${n} days ago`),
                week: (n) => n === 1 ? '1 week ago' : `${n} weeks ago`,
                month: (n) => n === 1 ? '1 month ago' : `${n} months ago`,
                year: (n) => n === 1 ? '1 year ago' : `${n} years ago`,
            };
        if (diffDays < 1)
            return labels.justNow;
        if (diffDays < 7)
            return labels.day(diffDays);
        if (diffDays < 30)
            return labels.week(Math.floor(diffDays / 7));
        if (diffDays < 365)
            return labels.month(Math.floor(diffDays / 30));
        return labels.year(Math.floor(diffDays / 365));
    }
    getVideos(dto) {
        const { sort = 'hype', limit, lang = 'es' } = dto;
        const raw = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
        const items = raw.items;
        const videos = items.map((item) => {
            const likes = parseInt(item.statistics.likeCount, 10) || 0;
            const views = parseInt(item.statistics.viewCount, 10) || 0;
            const comments = item.statistics.commentCount !== undefined
                ? parseInt(item.statistics.commentCount, 10)
                : null;
            const hypeLevel = this.calculateHype(likes, comments, views, item.snippet.title);
            return {
                id: item.id,
                title: item.snippet.title,
                author: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.high.url,
                publishedAt: this.getRelativeDate(item.snippet.publishedAt, lang),
                hypeLevel: Math.round(hypeLevel * 10000) / 10000,
                isCrown: false,
            };
        });
        videos.sort((a, b) => {
            if (sort === 'date') {
                const rawItems = items;
                const dateA = new Date(rawItems.find((i) => i.id === a.id).snippet.publishedAt).getTime();
                const dateB = new Date(rawItems.find((i) => i.id === b.id).snippet.publishedAt).getTime();
                return dateB - dateA;
            }
            return b.hypeLevel - a.hypeLevel;
        });
        const maxHype = Math.max(...videos.map((v) => v.hypeLevel));
        const crownIndex = videos.findIndex((v) => v.hypeLevel === maxHype);
        if (crownIndex !== -1)
            videos[crownIndex].isCrown = true;
        return limit ? videos.slice(0, limit) : videos;
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = __decorate([
    (0, common_1.Injectable)()
], VideosService);
//# sourceMappingURL=videos.service.js.map
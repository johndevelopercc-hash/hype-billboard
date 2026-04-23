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
export declare class VideosService {
    private readonly dataPath;
    calculateHype(likes: number, comments: number | null, views: number, title: string): number;
    getRelativeDate(publishedAt: string, lang: 'es' | 'en'): string;
    getVideos(dto: GetVideosDto): VideoItem[];
}

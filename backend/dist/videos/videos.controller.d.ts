import { VideosService, VideoItem } from './videos.service';
import { GetVideosDto } from './dto/get-videos.dto';
export declare class VideosController {
    private readonly videosService;
    constructor(videosService: VideosService);
    getVideos(dto: GetVideosDto): VideoItem[];
}

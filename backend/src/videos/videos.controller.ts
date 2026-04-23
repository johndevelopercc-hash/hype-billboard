import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VideosService, VideoItem } from './videos.service';
import { GetVideosDto } from './dto/get-videos.dto';

@ApiTags('videos')
@Controller('api/videos')
@UseInterceptors(CacheInterceptor)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @CacheTTL(60)
  @ApiOperation({
    summary: 'Get video billboard',
    description:
      'Returns a cleaned and transformed list of videos with Hype Level calculated. The video with the highest hype is flagged as the Crown Jewel.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of videos ordered by hype or date',
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  getVideos(@Query() dto: GetVideosDto): VideoItem[] {
    return this.videosService.getVideos(dto);
  }
}

import { Controller, Get, Injectable, Module, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

export interface TrendingPin {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  sourceUrl: string;
  boardName: string;
  pinCount: number;
}

@Injectable()
export class SocialService {
  constructor(private readonly configService: ConfigService) {}

  async getTrending(limit: number): Promise<TrendingPin[]> {
    const token   = this.configService.get<string>("PINTEREST_ACCESS_TOKEN");
    const boardId = this.configService.get<string>("PINTEREST_BOARD_ID");

    if (!token || !boardId) {
      return [];
    }

    try {
      const res = await fetch(
        `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) return [];

      const data = await res.json() as {
        items?: Array<{
          id: string;
          title?: string;
          description?: string;
          link?: string;
          media?: { images?: { "1200x"?: { url?: string } } };
          save_count?: number;
          board_owner?: { username?: string };
        }>;
      };

      const pins = (data.items ?? [])
        .map((pin) => ({
        id: pin.id,
        imageUrl: pin.media?.images?.["1200x"]?.url ?? "",
        title:       pin.title       ?? "Trending Look",
        description: pin.description ?? "",
        sourceUrl:   pin.link        ?? "https://pinterest.com",
        boardName:   pin.board_owner?.username ?? "Pinterest",
        pinCount:    pin.save_count  ?? 0,
      }))
        .filter((pin) => pin.imageUrl);

      return pins;
    } catch {
      return [];
    }
  }
}

@ApiBearerAuth()
@ApiTags("social")
@Controller("social")
class SocialController {
  constructor(private readonly service: SocialService) {}

  @Get("trending")
  getTrending(@Query("limit") limit?: string) {
    return this.service.getTrending(Math.min(Number(limit ?? 8), 20));
  }
}

@Module({
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}

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

// Curated Indian college fashion inspiration — shown when Pinterest is not configured
const STUB_PINS: TrendingPin[] = [
  {
    id: "stub-1",
    imageUrl: "https://picsum.photos/seed/indian-kurta/400/533",
    title: "Pastel Floral Kurta Set",
    description: "Light cotton kurta with palazzo — perfect for college days",
    sourceUrl: "https://pinterest.com",
    boardName: "Indian College Fashion",
    pinCount: 2340,
  },
  {
    id: "stub-2",
    imageUrl: "https://picsum.photos/seed/streetwear-india/400/533",
    title: "Desi Streetwear Look",
    description: "Graphic tee with wide-leg joggers and chunky sneakers",
    sourceUrl: "https://pinterest.com",
    boardName: "Streetwear India",
    pinCount: 1890,
  },
  {
    id: "stub-3",
    imageUrl: "https://picsum.photos/seed/ethnic-fusion/400/533",
    title: "Ethnic Fusion – Saree Drape Modern",
    description: "Modern saree drape with crop blouse for fest season",
    sourceUrl: "https://pinterest.com",
    boardName: "Ethnic Fusion",
    pinCount: 3210,
  },
  {
    id: "stub-4",
    imageUrl: "https://picsum.photos/seed/coord-set-india/400/533",
    title: "Co-ord Set Vibes",
    description: "Matching printed co-ord set — easy college outfit",
    sourceUrl: "https://pinterest.com",
    boardName: "Co-ord Goals",
    pinCount: 1560,
  },
  {
    id: "stub-5",
    imageUrl: "https://picsum.photos/seed/indo-western/400/533",
    title: "Indo-Western Party Look",
    description: "Sharara with crop top for the weekend party",
    sourceUrl: "https://pinterest.com",
    boardName: "Party Outfits India",
    pinCount: 2780,
  },
  {
    id: "stub-6",
    imageUrl: "https://picsum.photos/seed/denim-india/400/533",
    title: "Denim on Denim – Indian Edit",
    description: "Chambray shirt tucked into straight-cut jeans",
    sourceUrl: "https://pinterest.com",
    boardName: "Casual Indian Looks",
    pinCount: 1120,
  },
  {
    id: "stub-7",
    imageUrl: "https://picsum.photos/seed/formal-india/400/533",
    title: "Formal Blazer Set",
    description: "Structured blazer with tailored trousers for campus interviews",
    sourceUrl: "https://pinterest.com",
    boardName: "Campus Formal",
    pinCount: 980,
  },
  {
    id: "stub-8",
    imageUrl: "https://picsum.photos/seed/boho-india/400/533",
    title: "Boho Festival Look",
    description: "Mirror-work top with flared skirt for college fests",
    sourceUrl: "https://pinterest.com",
    boardName: "Festival Fashion",
    pinCount: 4100,
  },
];

@Injectable()
class SocialService {
  constructor(private readonly configService: ConfigService) {}

  async getTrending(limit: number): Promise<TrendingPin[]> {
    const token   = this.configService.get<string>("PINTEREST_ACCESS_TOKEN");
    const boardId = this.configService.get<string>("PINTEREST_BOARD_ID");

    if (!token || !boardId) {
      return STUB_PINS.slice(0, limit);
    }

    try {
      const res = await fetch(
        `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) return STUB_PINS.slice(0, limit);

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

      const pins = (data.items ?? []).map((pin) => ({
        id: pin.id,
        imageUrl: pin.media?.images?.["1200x"]?.url ?? `https://picsum.photos/seed/${pin.id}/400/533`,
        title:       pin.title       ?? "Trending Look",
        description: pin.description ?? "",
        sourceUrl:   pin.link        ?? "https://pinterest.com",
        boardName:   pin.board_owner?.username ?? "Pinterest",
        pinCount:    pin.save_count  ?? 0,
      }));

      return pins.length ? pins : STUB_PINS.slice(0, limit);
    } catch {
      return STUB_PINS.slice(0, limit);
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
})
export class SocialModule {}

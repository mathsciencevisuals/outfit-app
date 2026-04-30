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

// Curated fashion inspiration shown when Pinterest credentials are not configured.
// Uses Unsplash Source API — no key required, images redirect to real fashion photos.
const FALLBACK_PINS: TrendingPin[] = [
  {
    id: "f1",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    title: "Summer Floral Dress",
    description: "Light, breezy floral midi dress perfect for warm days",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=summer+dress+fashion",
    boardName: "Summer Looks",
    pinCount: 4200,
  },
  {
    id: "f2",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    title: "Street Style Coord Set",
    description: "Trending co-ord sets for everyday glam",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=coord+set+fashion",
    boardName: "Street Style",
    pinCount: 3800,
  },
  {
    id: "f3",
    imageUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80",
    title: "Minimalist White Outfit",
    description: "Clean, modern all-white looks that never go out of style",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=minimalist+white+outfit",
    boardName: "Minimal Fashion",
    pinCount: 5100,
  },
  {
    id: "f4",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    title: "Boho Ethnic Wear",
    description: "Vibrant ethnic prints and handcrafted embroidery",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=ethnic+wear+india",
    boardName: "Ethnic Chic",
    pinCount: 6300,
  },
  {
    id: "f5",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80",
    title: "Power Blazer Look",
    description: "Structured blazers dominating the work-to-weekend scene",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=blazer+outfit+women",
    boardName: "Office Fashion",
    pinCount: 2900,
  },
  {
    id: "f6",
    imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
    title: "Pastel Kurta Set",
    description: "Soft pastel kurta sets trending this season",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=pastel+kurta+set",
    boardName: "Indian Fusion",
    pinCount: 7800,
  },
  {
    id: "f7",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    title: "Denim on Denim",
    description: "The double denim trend is back and stronger than ever",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=denim+on+denim+fashion",
    boardName: "Denim Trends",
    pinCount: 3400,
  },
  {
    id: "f8",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
    title: "Party Glam Outfit",
    description: "Sequins and shimmer for your next evening event",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=party+outfit+glam",
    boardName: "Evening Glam",
    pinCount: 4600,
  },
];

@Injectable()
export class SocialService {
  constructor(private readonly configService: ConfigService) {}

  async getTrending(limit: number): Promise<TrendingPin[]> {
    const token   = this.configService.get<string>("PINTEREST_ACCESS_TOKEN");
    const boardId = this.configService.get<string>("PINTEREST_BOARD_ID");

    if (!token || !boardId) {
      return FALLBACK_PINS.slice(0, limit);
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

import { Controller, Get, Injectable, Module, Query } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { PrismaService } from "../../common/prisma.service";
import {
  FITME_BOARDS, GENDER_MAP, SIZE_MAP, BUDGET_MAP, BUDGET_BOARD_KEYS,
} from "./board-map";

export interface TrendingPin {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  sourceUrl: string;
  affiliateLink?: string;
  boardName: string;
  boardKey: string;
  pinCount: number;
  gender?: string | null;
  sizeCategory?: string | null;
  budgetRange?: string | null;
  estimatedPrice?: number | null;
  colours: string[];
  styleCategories: string[];
  occasion?: string | null;
  isAnalysed: boolean;
}

const FALLBACK_PINS: TrendingPin[] = [
  {
    id: "f1",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
    title: "Summer Floral Dress",
    description: "Light, breezy floral midi dress perfect for warm days",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=summer+dress+fashion",
    boardName: "Summer Looks", boardKey: "women", pinCount: 4200,
    colours: ["pink", "white"], styleCategories: ["casual", "bohemian"],
    occasion: "casual", isAnalysed: true,
  },
  {
    id: "f2",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
    title: "Street Style Coord Set",
    description: "Trending co-ord sets for everyday glam",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=coord+set+fashion",
    boardName: "Street Style", boardKey: "streetwear", pinCount: 3800,
    colours: ["black", "white"], styleCategories: ["streetwear", "casual"],
    occasion: "college", isAnalysed: true,
  },
  {
    id: "f3",
    imageUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80",
    title: "Minimalist White Outfit",
    description: "Clean, modern all-white looks that never go out of style",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=minimalist+white+outfit",
    boardName: "Minimal Fashion", boardKey: "minimalist", pinCount: 5100,
    colours: ["white"], styleCategories: ["minimalist", "formal"],
    occasion: "formal", isAnalysed: true,
  },
  {
    id: "f4",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
    title: "Boho Ethnic Wear",
    description: "Vibrant ethnic prints and handcrafted embroidery",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=ethnic+wear+india",
    boardName: "Ethnic Chic", boardKey: "ethnic", pinCount: 6300,
    colours: ["earthy", "red"], styleCategories: ["ethnic", "bohemian"],
    occasion: "ethnic", isAnalysed: true,
  },
  {
    id: "f5",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80",
    title: "Power Blazer Look",
    description: "Structured blazers dominating the work-to-weekend scene",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=blazer+outfit+women",
    boardName: "Office Fashion", boardKey: "formal", pinCount: 2900,
    colours: ["navy", "black"], styleCategories: ["formal"],
    occasion: "formal", isAnalysed: true,
  },
  {
    id: "f6",
    imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80",
    title: "Pastel Kurta Set",
    description: "Soft pastel kurta sets trending this season",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=pastel+kurta+set",
    boardName: "Indian Fusion", boardKey: "ethnic", pinCount: 7800,
    colours: ["pink", "beige"], styleCategories: ["ethnic", "casual"],
    occasion: "college", isAnalysed: true,
  },
  {
    id: "f7",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
    title: "Denim on Denim",
    description: "The double denim trend is back and stronger than ever",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=denim+on+denim+fashion",
    boardName: "Denim Trends", boardKey: "casual", pinCount: 3400,
    colours: ["blue", "navy"], styleCategories: ["casual", "streetwear"],
    occasion: "college", isAnalysed: true,
  },
  {
    id: "f8",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80",
    title: "Party Glam Outfit",
    description: "Sequins and shimmer for your next evening event",
    sourceUrl: "https://www.pinterest.com/search/pins/?q=party+outfit+glam",
    boardName: "Evening Glam", boardKey: "party", pinCount: 4600,
    colours: ["brights", "pink"], styleCategories: ["party"],
    occasion: "party", isAnalysed: true,
  },
];

@Injectable()
export class SocialService {
  // In-memory board fetch TTL cache: boardKey → expiry timestamp
  private readonly boardFetchExpiry = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getTrending(limit: number): Promise<TrendingPin[]> {
    const token   = this.configService.get<string>("PINTEREST_ACCESS_TOKEN");
    const boardId = this.configService.get<string>("PINTEREST_BOARD_ID");

    if (!token || !boardId) {
      return FALLBACK_PINS.slice(0, limit);
    }

    try {
      const res = await fetch(
        `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=${limit}&fields=id,title,description,media,link,save_count`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) return FALLBACK_PINS.slice(0, limit);

      const data = await res.json() as {
        items?: Array<{
          id: string; title?: string; description?: string; link?: string;
          media?: { images?: { "736x"?: { url?: string }; "1200x"?: { url?: string } } };
          save_count?: number; board_owner?: { username?: string };
        }>;
      };

      return (data.items ?? [])
        .map((pin) => ({
          id: pin.id,
          imageUrl: pin.media?.images?.["736x"]?.url ?? pin.media?.images?.["1200x"]?.url ?? "",
          title: pin.title ?? "Trending Look",
          description: pin.description ?? "",
          sourceUrl: pin.link ?? `https://pinterest.com/pin/${pin.id}`,
          boardName: pin.board_owner?.username ?? "Pinterest",
          boardKey: "general",
          pinCount: pin.save_count ?? 0,
          colours: [], styleCategories: [], isAnalysed: false,
        }))
        .filter((p) => p.imageUrl)
        .slice(0, limit);
    } catch {
      return FALLBACK_PINS.slice(0, limit);
    }
  }

  async getPersonalisedPins(params: {
    styles:  string[];
    colors:  string[];
    gender:  string;
    size:    string;
    budget:  string;
    limit?:  number;
  }): Promise<TrendingPin[]> {
    const { styles, colors, gender, size, budget, limit = 12 } = params;
    const token = this.configService.get<string>("PINTEREST_ACCESS_TOKEN");

    // If no Pinterest credentials, return filtered fallback pins
    if (!token) {
      return this.filterFallback(FALLBACK_PINS, styles, colors, limit);
    }

    const boardKeys = this.resolveBoardKeys({ styles, colors, gender, budget });

    // Fetch boards that have expired cache
    await this.fetchAndCachePins(boardKeys, token);

    // Fire background Claude analysis without blocking response
    this.prisma.pinterestPin
      .findMany({ where: { boardKey: { in: boardKeys }, isAnalysed: false }, take: 20 })
      .then((unanalysed) => {
        if (unanalysed.length > 0) this.analysePinsWithClaude(unanalysed).catch(() => {});
      })
      .catch(() => {});

    const genderFilter = GENDER_MAP[gender] ?? null;
    const sizeFilter   = SIZE_MAP[size] ?? null;

    const pins = await this.prisma.pinterestPin.findMany({
      where: {
        boardKey: { in: boardKeys },
        OR: [
          { gender: genderFilter },
          { gender: 'unisex' },
          { gender: null },
        ],
        AND: [
          { OR: [{ sizeCategory: sizeFilter }, { sizeCategory: null }] },
          { OR: [{ budgetRange: budget }, { budgetRange: null }] },
        ],
      },
      orderBy: [{ isAnalysed: 'desc' }, { saveCount: 'desc' }],
      take: limit * 2,
    });

    const ranked = this.rankByStyleMatch(pins, styles, colors).slice(0, limit);

    // Wrap budget board pins with affiliate links
    return Promise.all(ranked.map(async (pin) => {
      const result: TrendingPin = {
        id: pin.id, imageUrl: pin.imageUrl, title: pin.title,
        description: pin.description, sourceUrl: pin.pinterestLink,
        boardName: pin.boardKey, boardKey: pin.boardKey,
        pinCount: pin.saveCount, gender: pin.gender,
        sizeCategory: pin.sizeCategory, budgetRange: pin.budgetRange,
        estimatedPrice: pin.estimatedPrice,
        colours: pin.colours, styleCategories: pin.styleCategories,
        occasion: pin.occasion, isAnalysed: pin.isAnalysed,
        affiliateLink: pin.affiliateLink ?? undefined,
      };
      if (BUDGET_BOARD_KEYS.includes(pin.boardKey) && !pin.affiliateLink) {
        result.affiliateLink = await this.wrapWithAffiliateLink(pin.pinterestLink, pin.id).catch(() => undefined);
      }
      return result;
    }));
  }

  private resolveBoardKeys(params: {
    styles: string[]; colors: string[]; gender: string; budget: string;
  }): string[] {
    const keys = new Set<string>();
    const gKey = GENDER_MAP[params.gender];
    if (gKey && this.boardExists(gKey)) keys.add(gKey);
    const bKey = BUDGET_MAP[params.budget];
    if (bKey && this.boardExists(bKey)) keys.add(bKey);
    for (const s of params.styles) {
      const k = s.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (this.boardExists(k)) keys.add(k);
    }
    for (const c of params.colors) {
      const k = c.toLowerCase();
      if (this.boardExists(k)) keys.add(k);
    }
    if (keys.size === 0) { keys.add('casual'); keys.add('unisex'); }
    return Array.from(keys);
  }

  private boardExists(key: string): boolean {
    const id = FITME_BOARDS[key];
    return !!id && id !== 'REPLACE_WITH_REAL_BOARD_ID';
  }

  private async fetchAndCachePins(boardKeys: string[], token: string): Promise<void> {
    const now = Date.now();
    await Promise.allSettled(boardKeys.map(async (key) => {
      const expiry = this.boardFetchExpiry.get(key) ?? 0;
      if (now < expiry) return; // still fresh (30 min TTL)

      const boardId = FITME_BOARDS[key];
      if (!boardId || boardId === 'REPLACE_WITH_REAL_BOARD_ID') return;

      try {
        const res = await fetch(
          `https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=25&fields=id,title,description,media,link,save_count`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json() as { items?: any[] };

        for (const item of data.items ?? []) {
          const imageUrl =
            item.media?.images?.['736x']?.url ??
            item.media?.images?.['400x300']?.url ?? '';
          if (!imageUrl) continue;
          await this.prisma.pinterestPin.upsert({
            where:  { id: item.id },
            create: {
              id: item.id, boardKey: key, imageUrl,
              title: item.title ?? '', description: item.description ?? '',
              pinterestLink: `https://pinterest.com/pin/${item.id}`,
              saveCount: item.save_count ?? 0, isAnalysed: false,
            },
            update: { saveCount: item.save_count ?? 0, imageUrl },
          });
        }
        this.boardFetchExpiry.set(key, now + 30 * 60 * 1000); // 30 min
      } catch { /* ignore — return cached DB data */ }
    }));
  }

  async analysePinsWithClaude(pins: { id: string; imageUrl: string; title: string; description: string }[]): Promise<void> {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return;

    const BATCH = 5;
    for (let i = 0; i < pins.length; i += BATCH) {
      const batch = pins.slice(i, i + BATCH);
      const pinList = batch.map((p, idx) =>
        `Pin ${idx + 1} ID:${p.id}: "${p.title}" — ${p.description}`
      ).join('\n');

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'url', url: batch[0].imageUrl } },
                {
                  type: 'text',
                  text: `Analyse these ${batch.length} Indian fashion pins.\n${pinList}\n\nReturn ONLY a JSON array, no markdown:\n[{\n  "id": "pin_id",\n  "gender": "male"|"female"|"unisex",\n  "sizeCategory": "XS-S"|"M-L"|"XL-XXL"|"plus",\n  "budgetRange": "under500"|"500_2000"|"2000_5000"|"above5000",\n  "estimatedPrice": <₹ number or null>,\n  "colours": ["black","blue",...],\n  "styleCategories": ["casual","ethnic","formal","streetwear","sports","minimalist","party","bohemian"],\n  "occasion": "casual"|"college"|"ethnic"|"formal"|"party"|"sports"\n}]\n\nIndian context: kurta/sherwani=ethnic male, saree/kurti/salwar=ethnic female.\nBudget: casual/streetwear ₹500-2000, ethnic/formal ₹2000+, luxury ₹5000+.`,
                },
              ],
            }],
          }),
        });

        if (!response.ok) continue;
        const data = await response.json() as { content?: Array<{ text?: string }> };
        const raw  = data.content?.[0]?.text ?? '[]';
        const results = JSON.parse(raw.replace(/```json?|```/g, '').trim()) as Array<{
          id: string; gender: string; sizeCategory: string; budgetRange: string;
          estimatedPrice: number | null; colours: string[]; styleCategories: string[]; occasion: string;
        }>;

        for (const result of results) {
          await this.prisma.pinterestPin.update({
            where: { id: result.id },
            data: {
              gender: result.gender, sizeCategory: result.sizeCategory,
              budgetRange: result.budgetRange, estimatedPrice: result.estimatedPrice,
              colours: result.colours ?? [], styleCategories: result.styleCategories ?? [],
              occasion: result.occasion, isAnalysed: true,
            },
          }).catch(() => {}); // pin may not exist yet
        }
      } catch { /* analysis is non-critical */ }

      await new Promise((r) => setTimeout(r, 500));
    }
  }

  async wrapWithAffiliateLink(originalUrl: string, pinId: string): Promise<string> {
    const apiKey   = this.configService.get<string>('CUELINKS_API_KEY');
    const sourceId = this.configService.get<string>('CUELINKS_SOURCE_ID');
    if (!apiKey || !sourceId) return originalUrl;

    try {
      const pin = await this.prisma.pinterestPin.findUnique({ where: { id: pinId } });
      if (pin?.affiliateLink) return pin.affiliateLink;

      const res = await fetch('https://cl.rdtk.io/api/v1/create-link', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: originalUrl, source_id: sourceId }),
      });
      const data = await res.json() as { short_url?: string };
      const affiliateUrl = data.short_url ?? originalUrl;

      await this.prisma.pinterestPin.update({
        where: { id: pinId },
        data: { affiliateLink: affiliateUrl },
      }).catch(() => {});

      return affiliateUrl;
    } catch {
      return originalUrl;
    }
  }

  private rankByStyleMatch(
    pins: Array<{
      id: string; imageUrl: string; title: string; description: string;
      pinterestLink: string; boardKey: string; saveCount: number; isAnalysed: boolean;
      affiliateLink: string | null; gender: string | null; sizeCategory: string | null;
      budgetRange: string | null; estimatedPrice: number | null;
      colours: string[]; styleCategories: string[]; occasion: string | null;
    }>,
    styles: string[],
    colors: string[],
  ) {
    return [...pins].sort((a, b) => {
      let sA = 0, sB = 0;
      for (const style of styles) {
        if (a.styleCategories?.includes(style)) sA += 3;
        if (b.styleCategories?.includes(style)) sB += 3;
      }
      for (const color of colors) {
        if (a.colours?.includes(color)) sA += 2;
        if (b.colours?.includes(color)) sB += 2;
      }
      sA += Math.min(5, Math.floor((a.saveCount ?? 0) / 100));
      sB += Math.min(5, Math.floor((b.saveCount ?? 0) / 100));
      if (a.isAnalysed) sA += 1;
      if (b.isAnalysed) sB += 1;
      return sB - sA;
    });
  }

  private filterFallback(pins: TrendingPin[], styles: string[], colors: string[], limit: number): TrendingPin[] {
    if (styles.length === 0 && colors.length === 0) return pins.slice(0, limit);
    const scored = pins.map((p) => {
      let score = 0;
      for (const s of styles) if (p.styleCategories?.includes(s)) score += 3;
      for (const c of colors) if (p.colours?.includes(c)) score += 2;
      return { pin: p, score };
    });
    return scored.sort((a, b) => b.score - a.score).map((x) => x.pin).slice(0, limit);
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

  @Get("pins")
  async getPersonalisedPins(
    @Query("userId") userId?: string,
    @Query("gender") gender?: string,
    @Query("size") size?: string,
    @Query("budget") budget?: string,
    @Query("styles") styles?: string,
    @Query("colors") colors?: string,
    @Query("limit") limit?: string,
  ) {
    const pins = await this.service.getPersonalisedPins({
      styles:  styles  ? styles.split(',')  : ['casual'],
      colors:  colors  ? colors.split(',')  : [],
      gender:  gender  ?? 'other',
      size:    size    ?? 'M',
      budget:  budget  ?? '500_2000',
      limit:   limit   ? Math.min(Number(limit), 20) : 12,
    });
    return { data: pins, source: 'pinterest', count: pins.length };
  }
}

@Module({
  controllers: [SocialController],
  providers:   [SocialService, PrismaService],
  exports:     [SocialService],
})
export class SocialModule {}

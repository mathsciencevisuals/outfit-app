import { Body, Controller, Injectable, Module, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

import { CurrentUser } from "../../common/auth/current-user.decorator";
import { AuthenticatedUser } from "../../common/auth/auth.types";
import { AuthorizationService } from "../../common/auth/authorization.service";
import { PrismaService } from "../../common/prisma.service";

class StyleQuizDto {
  @IsString()
  userId!: string;

  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface StylePrefsExtracted {
  category?: string;
  fit?: string;
  occasion?: string[];
  colorFamily?: string[];
  budget?: string;
}

interface StyleQuizResponse {
  nextQuestion: string | null;
  extractedPrefs: StylePrefsExtracted | null;
  isComplete: boolean;
}

const QUIZ_QUESTIONS = [
  "What's your go-to outfit for college? Describe it however you like.",
  "What kind of clothes make you feel most confident?",
  "Are you more into Indian ethnic wear or western styles — or a mix?",
  "What's your typical budget per outfit?",
];

@Injectable()
class OnboardingService {
  constructor(
    private readonly configService: ConfigService,
    private readonly authorizationService: AuthorizationService,
    private readonly prisma: PrismaService,
  ) {}

  async processStyleQuiz(
    user: AuthenticatedUser,
    dto: StyleQuizDto,
  ): Promise<StyleQuizResponse> {
    this.authorizationService.assertSelfOrPrivileged(user, dto.userId, "Cannot process quiz for another user");

    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    const stub: StyleQuizResponse = {
      nextQuestion: QUIZ_QUESTIONS[1] ?? null,
      extractedPrefs: { category: "casual", fit: "regular", occasion: ["college"] },
      isComplete: false,
    };
    if (!apiKey) return stub;

    const history = dto.history ?? [];
    const turnCount = history.filter(m => m.role === "user").length;
    const isComplete = turnCount >= QUIZ_QUESTIONS.length - 1;

    const systemPrompt = `You are a friendly fashion stylist onboarding a new college student user in India.
Your job:
1. Interpret their casual answers to extract structured style preferences.
2. Suggest a natural follow-up question if the conversation is not complete.
3. Return ONLY valid JSON, no other text.

JSON format:
{
  "extractedPrefs": {
    "category": "<casual|formal|ethnic|streetwear|sporty|bohemian|minimalist|party>",
    "fit": "<slim|regular|relaxed>",
    "occasion": ["college","party","formal","daily"],
    "colorFamily": ["neutral","earthy","bright","pastel","monochrome"],
    "budget": "<under500|500_2000|2000_5000|above5000>"
  },
  "nextQuestion": "<next question to ask, or null if complete>",
  "isComplete": <true|false>
}`;

    try {
      const messages = [
        ...history,
        { role: "user" as const, content: `Question: "${dto.question}"\nAnswer: "${dto.answer}"` },
      ];

      if (isComplete) {
        messages.push({ role: "user" as const, content: "That's all the questions. Please finalize the extracted preferences and set isComplete to true." });
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          system: systemPrompt,
          messages,
        }),
      });

      if (!res.ok) return stub;
      const data = await res.json() as { content?: Array<{ text?: string }> };
      const text = data.content?.[0]?.text ?? "{}";
      const parsed = JSON.parse(text) as StyleQuizResponse;

      // Save extracted prefs to profile if complete
      if (parsed.isComplete && parsed.extractedPrefs) {
        await (this.prisma.profile as any).upsert({
          where: { userId: dto.userId },
          update: {
            stylePreference: parsed.extractedPrefs as any,
            preferredColors: parsed.extractedPrefs.colorFamily ?? [],
          },
          create: {
            userId: dto.userId,
            firstName: "FitMe",
            lastName: "Member",
            stylePreference: parsed.extractedPrefs as any,
            preferredColors: parsed.extractedPrefs.colorFamily ?? [],
          },
        });
      }

      return parsed;
    } catch {
      return stub;
    }
  }
}

@ApiBearerAuth()
@ApiTags("onboarding")
@Controller("onboarding")
class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  @Post("style-quiz")
  processStyleQuiz(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StyleQuizDto,
  ) {
    return this.service.processStyleQuiz(user, dto);
  }
}

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, PrismaService],
})
export class OnboardingModule {}

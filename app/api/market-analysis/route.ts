import { NextResponse } from "next/server";

import { PersonStatus, ProjectStatus } from "../../../app/generated/prisma/enums";
import { authErrorResponse, requireAuth } from "../../../lib/auth";
import {
  MARKET_ANALYSIS_PERSON_SELECT,
  MARKET_ANALYSIS_PROJECT_SELECT,
  buildFocusInsights,
  buildCreatedAtWhere,
  buildMarketAnalysisResponse,
  parseMarketAnalysisQuery,
} from "../../../lib/market-analysis/api-adapter";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAuth(request);

    const query = parseMarketAnalysisQuery(new URL(request.url).searchParams);
    const createdAtWhere = buildCreatedAtWhere(query);
    const projectWhere = {
      status: { not: ProjectStatus.ARCHIVED },
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
      ...(query.focusOnly ? { isFocus: true } : {}),
    };
    const personWhere = {
      status: { not: PersonStatus.ARCHIVED },
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
    };

    const [projects, persons] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: MARKET_ANALYSIS_PROJECT_SELECT,
      }),
      prisma.person.findMany({
        where: personWhere,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        select: MARKET_ANALYSIS_PERSON_SELECT,
      }),
    ]);

    const response = buildMarketAnalysisResponse(projects, persons, query);
    return NextResponse.json({
      ...response,
      focusInsights: buildFocusInsights(response),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    return NextResponse.json({ message: "Market analysis fetch failed" }, { status: 500 });
  }
}

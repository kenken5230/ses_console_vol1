import { NextResponse } from "next/server";

import { PersonStatus, ProjectStatus } from "../../../app/generated/prisma/enums";
import { authErrorResponse, requireAuth } from "../../../lib/auth";
import {
  MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH,
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
    const cumulativeCreatedAtWhere = buildCreatedAtWhere({ fromMonth: MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH });
    const projectWhere = {
      status: { not: ProjectStatus.ARCHIVED },
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
      ...(query.focusOnly ? { isFocus: true } : {}),
    };
    const personWhere = {
      status: { not: PersonStatus.ARCHIVED },
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
    };
    const cumulativeProjectWhere = {
      status: { not: ProjectStatus.ARCHIVED },
      ...(cumulativeCreatedAtWhere ? { createdAt: cumulativeCreatedAtWhere } : {}),
      ...(query.focusOnly ? { isFocus: true } : {}),
    };
    const cumulativePersonWhere = {
      status: { not: PersonStatus.ARCHIVED },
      ...(cumulativeCreatedAtWhere ? { createdAt: cumulativeCreatedAtWhere } : {}),
    };

    const [projects, persons, cumulativeProjectCount, cumulativePersonCount] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        ...(query.limit ? { take: query.limit } : {}),
        orderBy: { createdAt: "desc" },
        select: MARKET_ANALYSIS_PROJECT_SELECT,
      }),
      prisma.person.findMany({
        where: personWhere,
        ...(query.limit ? { take: query.limit } : {}),
        orderBy: { createdAt: "desc" },
        select: MARKET_ANALYSIS_PERSON_SELECT,
      }),
      prisma.project.count({ where: cumulativeProjectWhere }),
      prisma.person.count({ where: cumulativePersonWhere }),
    ]);

    const response = buildMarketAnalysisResponse(projects, persons, {
      ...query,
      cumulativeCounts: {
        fromMonth: MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH,
        personCount: cumulativePersonCount,
        projectCount: cumulativeProjectCount,
      },
    });
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

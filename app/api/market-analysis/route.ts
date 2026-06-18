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

const cumulativeCreatedAtWhere = {
  gte: new Date(`${MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH}-01T00:00:00.000Z`),
};

export async function GET(request: Request) {
  try {
    await requireAuth(request);

    const query = parseMarketAnalysisQuery(new URL(request.url).searchParams);
    const createdAtWhere = buildCreatedAtWhere(query);
    const projectBaseWhere = {
      status: { not: ProjectStatus.ARCHIVED },
      ...(query.focusOnly ? { isFocus: true } : {}),
    };
    const projectWhere = {
      ...projectBaseWhere,
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
    };
    const personBaseWhere = {
      status: { not: PersonStatus.ARCHIVED },
    };
    const personWhere = {
      ...personBaseWhere,
      ...(createdAtWhere ? { createdAt: createdAtWhere } : {}),
    };
    const projectFindOptions = {
      where: projectWhere,
      ...(query.limit ? { take: query.limit } : {}),
      orderBy: { createdAt: "desc" as const },
      select: MARKET_ANALYSIS_PROJECT_SELECT,
    };
    const personFindOptions = {
      where: personWhere,
      ...(query.limit ? { take: query.limit } : {}),
      orderBy: { createdAt: "desc" as const },
      select: MARKET_ANALYSIS_PERSON_SELECT,
    };

    const [projects, persons, cumulativeProjectCount, cumulativePersonCount, cumulativeFocusProjectCount] = await Promise.all([
      prisma.project.findMany(projectFindOptions),
      prisma.person.findMany(personFindOptions),
      prisma.project.count({
        where: {
          ...projectBaseWhere,
          createdAt: cumulativeCreatedAtWhere,
        },
      }),
      prisma.person.count({
        where: {
          ...personBaseWhere,
          createdAt: cumulativeCreatedAtWhere,
        },
      }),
      prisma.project.count({
        where: {
          status: { not: ProjectStatus.ARCHIVED },
          isFocus: true,
          createdAt: cumulativeCreatedAtWhere,
        },
      }),
    ]);

    const response = buildMarketAnalysisResponse(projects, persons, {
      ...query,
      cumulativeFocusProjectCount,
      cumulativeFromMonth: MARKET_ANALYSIS_CUMULATIVE_FROM_MONTH,
      cumulativePersonCount,
      cumulativeProjectCount,
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

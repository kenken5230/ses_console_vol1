import "dotenv/config";

const MAX_LIMIT = 5000;

type CountMap = Record<string, number>;

export type SourceInventoryArgs = {
  limit: number;
};

type GroupCountRow = {
  _count: {
    _all: number;
  };
};

type SourceInventoryInput = {
  limit: number;
  sourceMailsTotal: number;
  sourceMailsByProvider: CountMap;
  sourceMailsByClassification: CountMap;
  extractionResultsTotal: number;
  extractionResultsByTargetType: CountMap;
  extractionResultsByExtractionType: CountMap;
  extractionResultsByReviewStatus: CountMap;
  mailEntityLinksTotal: number;
  mailEntityLinksByEntityType: CountMap;
  mailEntityLinksByLinkType: CountMap;
  projectsTotal: number;
  projectsWithSourceMailId: number;
  projectsWithoutSourceMailId: number;
  projectsGmailDerived: number;
  personsTotal: number;
  personsWithSourceMailId: number;
  personsWithoutSourceMailId: number;
  personsGmailDerived: number;
  mailsWithAnyEntityLink: number;
  mailsWithExtractedEntityLink: number;
  mailsWithExtractionTarget: number;
  projectSourceRelationshipSample: RelationshipSampleSummary;
  personSourceRelationshipSample: RelationshipSampleSummary;
  orphanLikeCounts: {
    projectsWithMissingSourceMail: number;
    personsWithMissingSourceMail: number;
  };
};

type RelationshipSampleSummary = {
  scanned: number;
  withSourceMailId: number;
  withAnyMailEntityLink: number;
  withSourceLink: number;
  withExtractedLink: number;
  sourceMailIdWithoutAnyLink: number;
  sampleLimit: number;
};

export type SourceInventoryReport = {
  summary: {
    mode: "source-inventory";
    readOnly: true;
    limit: number;
    maxLimit: number;
    piiSafe: true;
    secretsRedacted: true;
    databaseTarget: "configured-value-not-printed";
  };
  totals: {
    sourceMails: number;
    extractionResults: number;
    mailEntityLinks: number;
    projects: number;
    persons: number;
  };
  sourceMails: {
    byProvider: CountMap;
    byClassification: CountMap;
  };
  extractionResults: {
    byTargetType: CountMap;
    byExtractionType: CountMap;
    byReviewStatus: CountMap;
  };
  mailEntityLinks: {
    byEntityType: CountMap;
    byLinkType: CountMap;
  };
  entitySourceCoverage: {
    projects: {
      total: number;
      withSourceMailId: number;
      withoutSourceMailId: number;
      gmailDerived: number;
    };
    persons: {
      total: number;
      withSourceMailId: number;
      withoutSourceMailId: number;
      gmailDerived: number;
    };
  };
  linkCoverage: {
    mailsWithAnyEntityLink: number;
    mailsWithExtractedEntityLink: number;
    mailsWithExtractionTarget: number;
    projectSourceRelationshipSample: RelationshipSampleSummary;
    personSourceRelationshipSample: RelationshipSampleSummary;
  };
  trackingGaps: {
    missingGenericImportSourceTables: string[];
    sourceMailIdWithoutAnyLinkInSample: {
      projects: number;
      persons: number;
    };
    orphanLikeCounts: {
      projectsWithMissingSourceMail: number;
      personsWithMissingSourceMail: number;
    };
    duplicateOrRelatedMailCandidateSignal: {
      relatedMailLinks: number;
      note: string;
    };
  };
  recommendedNextSteps: string[];
  notes: string[];
};

function parseArgValue(argv: string[], name: string): string | null {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

export function parseSourceInventoryArgs(argv = process.argv): SourceInventoryArgs {
  if (argv.some((arg) => arg === "--apply" || arg.startsWith("--apply="))) {
    throw new Error("source:inventory is read-only and does not accept --apply.");
  }

  const rawLimit = parseArgValue(argv, "limit");
  if (!rawLimit) {
    throw new Error("Missing required --limit=N. source:inventory is read-only; start with --limit=500.");
  }

  const limit = Number(rawLimit);
  if (!Number.isFinite(limit) || limit <= 0 || !Number.isInteger(limit)) {
    throw new Error("--limit must be a positive integer.");
  }
  if (limit > MAX_LIMIT) {
    throw new Error(`--limit must be <= ${MAX_LIMIT}.`);
  }

  return { limit };
}

function sortedCountMap(map: CountMap): CountMap {
  return Object.fromEntries(Object.entries(map).sort(([left], [right]) => left.localeCompare(right)));
}

function increment(map: CountMap, key: string, value: number): void {
  map[key] = (map[key] ?? 0) + value;
}

function groupRowsToCountMap(rows: Array<GroupCountRow & Record<string, string>>, key: string): CountMap {
  const map: CountMap = {};
  for (const row of rows) {
    increment(map, row[key] ?? "UNKNOWN", row._count._all);
  }
  return sortedCountMap(map);
}

export function assertNoSensitiveInventoryOutput(text: string): void {
  const forbiddenPatterns = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b(?:postgres(?:ql)?|mysql|sqlserver):\/\//i,
    /\b(?:DATABASE_URL|DIRECT_URL|SMTP_PASSWORD|GMAIL_REFRESH_TOKEN|API[_-]?KEY|TOKEN|PASSWORD)\s*[:=]\s*["']?[^"',\s}]+/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /-----BEGIN [A-Z ]+KEY-----/,
    /"subject"\s*:/i,
    /"body(?:Text|Html|Raw|Normalized)?"\s*:/i,
    /"fromEmail"\s*:/i,
    /"toEmails"\s*:/i,
    /"ccEmails"\s*:/i,
  ];

  const matched = forbiddenPatterns.find((pattern) => pattern.test(text));
  if (matched) {
    throw new Error(`Sensitive source inventory output matched ${matched}`);
  }
}

export function buildSourceInventoryReport(input: SourceInventoryInput): SourceInventoryReport {
  return {
    summary: {
      mode: "source-inventory",
      readOnly: true,
      limit: input.limit,
      maxLimit: MAX_LIMIT,
      piiSafe: true,
      secretsRedacted: true,
      databaseTarget: "configured-value-not-printed",
    },
    totals: {
      sourceMails: input.sourceMailsTotal,
      extractionResults: input.extractionResultsTotal,
      mailEntityLinks: input.mailEntityLinksTotal,
      projects: input.projectsTotal,
      persons: input.personsTotal,
    },
    sourceMails: {
      byProvider: sortedCountMap(input.sourceMailsByProvider),
      byClassification: sortedCountMap(input.sourceMailsByClassification),
    },
    extractionResults: {
      byTargetType: sortedCountMap(input.extractionResultsByTargetType),
      byExtractionType: sortedCountMap(input.extractionResultsByExtractionType),
      byReviewStatus: sortedCountMap(input.extractionResultsByReviewStatus),
    },
    mailEntityLinks: {
      byEntityType: sortedCountMap(input.mailEntityLinksByEntityType),
      byLinkType: sortedCountMap(input.mailEntityLinksByLinkType),
    },
    entitySourceCoverage: {
      projects: {
        total: input.projectsTotal,
        withSourceMailId: input.projectsWithSourceMailId,
        withoutSourceMailId: input.projectsWithoutSourceMailId,
        gmailDerived: input.projectsGmailDerived,
      },
      persons: {
        total: input.personsTotal,
        withSourceMailId: input.personsWithSourceMailId,
        withoutSourceMailId: input.personsWithoutSourceMailId,
        gmailDerived: input.personsGmailDerived,
      },
    },
    linkCoverage: {
      mailsWithAnyEntityLink: input.mailsWithAnyEntityLink,
      mailsWithExtractedEntityLink: input.mailsWithExtractedEntityLink,
      mailsWithExtractionTarget: input.mailsWithExtractionTarget,
      projectSourceRelationshipSample: input.projectSourceRelationshipSample,
      personSourceRelationshipSample: input.personSourceRelationshipSample,
    },
    trackingGaps: {
      missingGenericImportSourceTables: [
        "import_sources",
        "import_runs",
        "source_records",
        "entity_source_links",
      ],
      sourceMailIdWithoutAnyLinkInSample: {
        projects: input.projectSourceRelationshipSample.sourceMailIdWithoutAnyLink,
        persons: input.personSourceRelationshipSample.sourceMailIdWithoutAnyLink,
      },
      orphanLikeCounts: input.orphanLikeCounts,
      duplicateOrRelatedMailCandidateSignal: {
        relatedMailLinks: input.mailEntityLinksByLinkType.RELATED ?? 0,
        note: "Only existing link metadata is counted here. Run quality-audit for extraction-level duplicate/relation heuristics.",
      },
    },
    recommendedNextSteps: [
      "Review additive schema migration proposal for generic import_sources/import_runs/source_records/entity_source_links.",
      "Build CSV import dry-run MVP before any apply path.",
      "Add Notion read-only sync skeleton after owner approves Notion API access boundaries.",
      "Define deterministic matching rules that reuse existing Gmail sourceMailId and mailEntityLinks safely.",
    ],
    notes: [
      "read-only inventory; no DB writes",
      "limit is required and caps sample-based relationship scans",
      "subjects, bodies, emails, names, company names, customer names, and secrets are not selected or printed",
      "database connection value is never printed",
    ],
  };
}

async function relationshipSample(
  prisma: any,
  entity: "project" | "person",
  sampleLimit: number,
): Promise<RelationshipSampleSummary> {
  const model = entity === "project" ? prisma.project : prisma.person;
  const entityType = entity === "project" ? "PROJECT" : "PERSON";
  const rows = await model.findMany({
    where: { sourceMailId: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: sampleLimit,
    select: {
      id: true,
      sourceMailId: true,
    },
  });

  if (rows.length === 0) {
    return {
      scanned: 0,
      withSourceMailId: 0,
      withAnyMailEntityLink: 0,
      withSourceLink: 0,
      withExtractedLink: 0,
      sourceMailIdWithoutAnyLink: 0,
      sampleLimit,
    };
  }

  const links = await prisma.mailEntityLink.findMany({
    where: {
      entityType,
      entityId: { in: rows.map((row: { id: string }) => row.id) },
    },
    select: {
      entityId: true,
      linkType: true,
    },
  });
  const linksByEntity = new Map<string, Set<string>>();
  for (const link of links) {
    const current = linksByEntity.get(link.entityId) ?? new Set<string>();
    current.add(link.linkType);
    linksByEntity.set(link.entityId, current);
  }

  let withAnyMailEntityLink = 0;
  let withSourceLink = 0;
  let withExtractedLink = 0;
  for (const row of rows) {
    const linkTypes = linksByEntity.get(row.id);
    if (!linkTypes) continue;
    withAnyMailEntityLink += 1;
    if (linkTypes.has("SOURCE")) withSourceLink += 1;
    if (linkTypes.has("EXTRACTED")) withExtractedLink += 1;
  }

  return {
    scanned: rows.length,
    withSourceMailId: rows.length,
    withAnyMailEntityLink,
    withSourceLink,
    withExtractedLink,
    sourceMailIdWithoutAnyLink: rows.length - withAnyMailEntityLink,
    sampleLimit,
  };
}

async function collectSourceInventory(prisma: any, limit: number): Promise<SourceInventoryInput> {
  const [
    mailAccounts,
    sourceMailsTotal,
    sourceMailAccountRows,
    sourceMailClassificationRows,
    extractionResultsTotal,
    extractionTargetRows,
    extractionTypeRows,
    extractionStatusRows,
    mailEntityLinksTotal,
    mailEntityLinkEntityRows,
    mailEntityLinkTypeRows,
    projectsTotal,
    projectsWithSourceMailId,
    personsTotal,
    personsWithSourceMailId,
    projectsGmailDerived,
    personsGmailDerived,
    mailsWithAnyEntityLink,
    mailsWithExtractedEntityLink,
    mailsWithExtractionTarget,
    projectsWithMissingSourceMail,
    personsWithMissingSourceMail,
  ] = await Promise.all([
    prisma.mailAccount.findMany({ select: { id: true, provider: true } }),
    prisma.mailNotification.count(),
    prisma.mailNotification.groupBy({ by: ["sourceAccountId"], _count: { _all: true } }),
    prisma.mailNotification.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.extractionResult.count(),
    prisma.extractionResult.groupBy({ by: ["targetType"], _count: { _all: true } }),
    prisma.extractionResult.groupBy({ by: ["extractionType"], _count: { _all: true } }),
    prisma.extractionResult.groupBy({ by: ["reviewStatus"], _count: { _all: true } }),
    prisma.mailEntityLink.count(),
    prisma.mailEntityLink.groupBy({ by: ["entityType"], _count: { _all: true } }),
    prisma.mailEntityLink.groupBy({ by: ["linkType"], _count: { _all: true } }),
    prisma.project.count(),
    prisma.project.count({ where: { sourceMailId: { not: null } } }),
    prisma.person.count(),
    prisma.person.count({ where: { sourceMailId: { not: null } } }),
    prisma.project.count({
      where: {
        sourceMail: {
          is: {
            sourceAccount: {
              is: { provider: "GMAIL" },
            },
          },
        },
      },
    }),
    prisma.person.count({
      where: {
        sourceMail: {
          is: {
            sourceAccount: {
              is: { provider: "GMAIL" },
            },
          },
        },
      },
    }),
    prisma.mailNotification.count({ where: { entityLinks: { some: {} } } }),
    prisma.mailNotification.count({ where: { entityLinks: { some: { linkType: "EXTRACTED" } } } }),
    prisma.mailNotification.count({ where: { extractionResults: { some: { targetId: { not: null } } } } }),
    prisma.project.count({ where: { sourceMailId: { not: null }, sourceMail: null } }),
    prisma.person.count({ where: { sourceMailId: { not: null }, sourceMail: null } }),
  ]);

  const accountProviderById = new Map<string, string>();
  for (const account of mailAccounts) {
    accountProviderById.set(account.id, account.provider);
  }
  const sourceMailsByProvider: CountMap = {};
  for (const row of sourceMailAccountRows) {
    const provider = accountProviderById.get(row.sourceAccountId) ?? "UNKNOWN";
    increment(sourceMailsByProvider, provider, row._count._all);
  }

  const [projectSourceRelationshipSample, personSourceRelationshipSample] = await Promise.all([
    relationshipSample(prisma, "project", limit),
    relationshipSample(prisma, "person", limit),
  ]);

  return {
    limit,
    sourceMailsTotal,
    sourceMailsByProvider,
    sourceMailsByClassification: groupRowsToCountMap(sourceMailClassificationRows, "category"),
    extractionResultsTotal,
    extractionResultsByTargetType: groupRowsToCountMap(extractionTargetRows, "targetType"),
    extractionResultsByExtractionType: groupRowsToCountMap(extractionTypeRows, "extractionType"),
    extractionResultsByReviewStatus: groupRowsToCountMap(extractionStatusRows, "reviewStatus"),
    mailEntityLinksTotal,
    mailEntityLinksByEntityType: groupRowsToCountMap(mailEntityLinkEntityRows, "entityType"),
    mailEntityLinksByLinkType: groupRowsToCountMap(mailEntityLinkTypeRows, "linkType"),
    projectsTotal,
    projectsWithSourceMailId,
    projectsWithoutSourceMailId: projectsTotal - projectsWithSourceMailId,
    projectsGmailDerived,
    personsTotal,
    personsWithSourceMailId,
    personsWithoutSourceMailId: personsTotal - personsWithSourceMailId,
    personsGmailDerived,
    mailsWithAnyEntityLink,
    mailsWithExtractedEntityLink,
    mailsWithExtractionTarget,
    projectSourceRelationshipSample,
    personSourceRelationshipSample,
    orphanLikeCounts: {
      projectsWithMissingSourceMail,
      personsWithMissingSourceMail,
    },
  };
}

export async function runSourceInventory(argv = process.argv): Promise<SourceInventoryReport> {
  const { limit } = parseSourceInventoryArgs(argv);
  const { prisma } = await import("../lib/prisma");
  const input = await collectSourceInventory(prisma, limit);
  const report = buildSourceInventoryReport(input);
  assertNoSensitiveInventoryOutput(JSON.stringify(report));
  return report;
}

if (require.main === module) {
  runSourceInventory()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

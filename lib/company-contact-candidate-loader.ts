import {
  findCompanyContactCandidates,
  type CompanyContactCandidate,
  type CompanyContactCandidateSource
} from "./company-contact-candidates";

export const COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE = 1000;
export const COMPANY_CONTACT_CANDIDATE_MAX_RECORDS_TO_INSPECT = 300;

function matchingExtractionResults(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  const extractionResults = sourceMail?.extractionResults || [];
  return extractionResults.filter((result: any) => {
    return result.targetType === targetType && result.targetId === targetId;
  });
}

function latestMatchingExtractionResult(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  return matchingExtractionResults(sourceMail, targetType, targetId).sort((a: any, b: any) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function latestNormalizedExtraction(sourceMail: any, targetType: "PROJECT" | "PERSON", targetId: string) {
  const result = latestMatchingExtractionResult(sourceMail, targetType, targetId);
  return result?.normalizedResult && typeof result.normalizedResult === "object"
    ? result.normalizedResult
    : {};
}

function buildCompanyContactCandidateSources(companies: any[]): CompanyContactCandidateSource[] {
  return companies.flatMap((company) => {
    const safeCompany = {
      id: company.id,
      name: company.name,
      tradeStatus: company.tradeStatus,
      mainEmailDomain: company.mainEmailDomain,
      tdbScore: company.tdbScore
    };
    const contacts = company.contacts || [];
    if (!contacts.length) return [{ company: safeCompany, contact: null }];

    return contacts.map((contact: any) => ({
      company: safeCompany,
      contact
    }));
  });
}

function firstCandidateText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text) return text;
  }
  return "";
}

function personCompanyContactCandidateInput(person: any, normalizedExtraction: any) {
  return {
    companyName: firstCandidateText(
      normalizedExtraction.ownerCompanyName,
      person.ownerCompany?.name,
      person.sourceMail?.fromName
    ),
    email: firstCandidateText(person.sourceMail?.fromEmail, person.ownerContact?.email),
    contactEmail: firstCandidateText(
      normalizedExtraction.contactEmail,
      person.ownerContact?.email,
      person.sourceMail?.fromEmail
    ),
    contactName: firstCandidateText(
      normalizedExtraction.contactName,
      person.ownerContact?.name,
      person.sourceMail?.fromName
    )
  };
}

function projectCompanyContactCandidateInput(
  project: any,
  normalizedExtraction: any,
  upperCompanyRole: any,
  primaryContactRole: any
) {
  return {
    companyName: firstCandidateText(
      normalizedExtraction.upperCompanyName,
      upperCompanyRole?.company?.name,
      primaryContactRole?.company?.name,
      project.sourceMail?.fromName
    ),
    email: firstCandidateText(project.sourceMail?.fromEmail, primaryContactRole?.companyContact?.email),
    contactEmail: firstCandidateText(
      normalizedExtraction.contactEmail,
      primaryContactRole?.companyContact?.email,
      project.sourceMail?.fromEmail
    ),
    contactName: firstCandidateText(
      normalizedExtraction.contactName,
      primaryContactRole?.companyContact?.name,
      project.sourceMail?.fromName
    )
  };
}

function pickProjectCompanyRole(project: any) {
  const preferredRoles = ["UPPER_COMPANY", "PRIME_CONTRACTOR", "END_USER"];
  return preferredRoles.map((role) => project.companyRoles.find((item: any) => item.role === role)).find(Boolean)
    || project.companyRoles[0];
}

async function loadCompanyContactCandidateSources(db: any) {
  const companies = await db.company.findMany({
    take: COMPANY_CONTACT_CANDIDATE_COMPANY_TAKE,
    orderBy: [
      { normalizedName: "asc" },
      { id: "asc" }
    ],
    select: {
      id: true,
      name: true,
      tradeStatus: true,
      mainEmailDomain: true,
      tdbScore: true,
      contacts: {
        orderBy: [
          { name: "asc" },
          { id: "asc" }
        ],
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          phone: true,
          department: true,
          position: true,
          isActive: true
        }
      }
    }
  });

  return buildCompanyContactCandidateSources(companies);
}

function findCandidates(input: any, sources: readonly CompanyContactCandidateSource[]): CompanyContactCandidate[] {
  return findCompanyContactCandidates(input, sources, {
    maxCandidates: 5,
    maxRecordsToInspect: COMPANY_CONTACT_CANDIDATE_MAX_RECORDS_TO_INSPECT
  });
}

export async function loadProjectCompanyContactCandidates(db: any, projectId: string) {
  const [project, sources] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        sourceMail: {
          select: {
            fromName: true,
            fromEmail: true,
            extractionResults: {
              orderBy: { createdAt: "desc" },
              select: {
                targetType: true,
                targetId: true,
                createdAt: true,
                normalizedResult: true
              }
            }
          }
        },
        companyRoles: {
          orderBy: { roleOrder: "asc" },
          select: {
            role: true,
            company: {
              select: {
                id: true,
                name: true,
                tradeStatus: true,
                mainEmailDomain: true,
                tdbScore: true
              }
            },
            companyContact: {
              select: {
                id: true,
                companyId: true,
                name: true,
                email: true,
                phone: true,
                department: true,
                position: true,
                isActive: true
              }
            }
          }
        }
      }
    }),
    loadCompanyContactCandidateSources(db)
  ]);

  if (!project) return null;

  const upperCompanyRole = pickProjectCompanyRole(project);
  const primaryContactRole = project.companyRoles.find((role: any) => role.companyContact);
  const normalizedExtraction = latestNormalizedExtraction(project.sourceMail, "PROJECT", project.id);
  return findCandidates(
    projectCompanyContactCandidateInput(project, normalizedExtraction, upperCompanyRole, primaryContactRole),
    sources
  );
}

export async function loadPersonCompanyContactCandidates(db: any, personId: string) {
  const [person, sources] = await Promise.all([
    db.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        sourceMail: {
          select: {
            fromName: true,
            fromEmail: true,
            extractionResults: {
              orderBy: { createdAt: "desc" },
              select: {
                targetType: true,
                targetId: true,
                createdAt: true,
                normalizedResult: true
              }
            }
          }
        },
        ownerCompany: {
          select: {
            id: true,
            name: true,
            tradeStatus: true,
            mainEmailDomain: true,
            tdbScore: true
          }
        },
        ownerContact: {
          select: {
            id: true,
            companyId: true,
            name: true,
            email: true,
            phone: true,
            department: true,
            position: true,
            isActive: true
          }
        }
      }
    }),
    loadCompanyContactCandidateSources(db)
  ]);

  if (!person) return null;

  const normalizedExtraction = latestNormalizedExtraction(person.sourceMail, "PERSON", person.id);
  return findCandidates(personCompanyContactCandidateInput(person, normalizedExtraction), sources);
}

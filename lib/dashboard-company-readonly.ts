type Nullable<T> = T | null | undefined;

type DecimalLike = {
  toString?: () => string;
};

export type DashboardCompanyLike = {
  id?: Nullable<string>;
  name?: Nullable<string>;
  mainEmailDomain?: Nullable<string>;
  tdbScore?: Nullable<string | number | DecimalLike>;
  tradeStatus?: Nullable<string>;
};

export type DashboardCompanyContactLike = {
  id?: Nullable<string>;
  name?: Nullable<string>;
  email?: Nullable<string>;
  phone?: Nullable<string>;
  department?: Nullable<string>;
  position?: Nullable<string>;
  isActive?: Nullable<boolean>;
};

export type DashboardProjectCompanyRoleLike = {
  id?: Nullable<string>;
  role?: Nullable<string>;
  roleOrder?: Nullable<number>;
  isPrimary?: Nullable<boolean>;
  company?: Nullable<DashboardCompanyLike>;
  companyContact?: Nullable<DashboardCompanyContactLike>;
};

export type SafeDashboardCompany = {
  id: string | null;
  name: string;
  tradeStatus: string;
  mainEmailDomain: string | null;
  tdbScore: string | null;
};

export type SafeDashboardCompanyContact = {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  isActive: boolean;
};

export type SafeDashboardProjectCompanyRole = {
  id: string | null;
  role: string;
  roleOrder: number;
  isPrimary: boolean;
  company: SafeDashboardCompany | null;
  contact: SafeDashboardCompanyContact | null;
};

const DEFAULT_STATUS = "UNKNOWN";
const DEFAULT_ROLE = "OTHER";

function cleanText(value: Nullable<unknown>, maxLength: number) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function decimalText(value: Nullable<string | number | DecimalLike>) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "string") return cleanText(value, 32);
  if (typeof value.toString === "function") return cleanText(value.toString(), 32);
  return null;
}

export function mapSafeCompany(company: Nullable<DashboardCompanyLike>): SafeDashboardCompany | null {
  if (!company) return null;
  const name = cleanText(company.name, 255);
  if (!name) return null;

  return {
    id: cleanText(company.id, 80),
    name,
    tradeStatus: cleanText(company.tradeStatus, 40) || DEFAULT_STATUS,
    mainEmailDomain: cleanText(company.mainEmailDomain, 255),
    tdbScore: decimalText(company.tdbScore)
  };
}

export function mapSafeCompanyContact(contact: Nullable<DashboardCompanyContactLike>): SafeDashboardCompanyContact | null {
  if (!contact) return null;
  const name = cleanText(contact.name, 160);
  const email = cleanText(contact.email, 255);
  const phone = cleanText(contact.phone, 80);
  if (!name && !email && !phone) return null;

  return {
    id: cleanText(contact.id, 80),
    name: name || email || phone || "-",
    email,
    phone,
    department: cleanText(contact.department, 160),
    position: cleanText(contact.position, 160),
    isActive: contact.isActive !== false
  };
}

export function mapProjectCompanyRoleReadOnly(
  role: Nullable<DashboardProjectCompanyRoleLike>
): SafeDashboardProjectCompanyRole | null {
  if (!role) return null;
  const company = mapSafeCompany(role.company);
  const contact = mapSafeCompanyContact(role.companyContact);
  if (!company && !contact) return null;

  return {
    id: cleanText(role.id, 80),
    role: cleanText(role.role, 80) || DEFAULT_ROLE,
    roleOrder: typeof role.roleOrder === "number" && Number.isFinite(role.roleOrder) ? role.roleOrder : 0,
    isPrimary: Boolean(role.isPrimary),
    company,
    contact
  };
}

export function mapProjectCompanyRolesReadOnly(
  roles: Nullable<DashboardProjectCompanyRoleLike[]>
): SafeDashboardProjectCompanyRole[] {
  return (roles || [])
    .map(mapProjectCompanyRoleReadOnly)
    .filter((role): role is SafeDashboardProjectCompanyRole => Boolean(role))
    .sort((a, b) => a.roleOrder - b.roleOrder);
}

export function mapPersonOwnerReadOnly(person: {
  ownerCompany?: Nullable<DashboardCompanyLike>;
  ownerContact?: Nullable<DashboardCompanyContactLike>;
}) {
  return {
    ownerCompany: mapSafeCompany(person.ownerCompany),
    ownerContact: mapSafeCompanyContact(person.ownerContact)
  };
}

import assert from "node:assert/strict";

import {
  BLOCKED_COMPANY_LINK_TRADE_STATUSES,
  companyLinkTradeStatusReasonCode,
  findUnsafeLinkPayloadField,
  isAllowedNonProductionLinkWriteTarget,
  isBlockedCompanyLinkTradeStatus,
  isCompanyContactLinkWriterRole,
  isLinkProductionRuntime,
  LINK_FORBIDDEN_RAW_PAYLOAD_KEYS,
  LINK_NON_PRODUCTION_WRITE_TARGETS,
  LINK_WRITER_ROLES,
} from "../lib/link-safety-policy";

assert.deepEqual([...LINK_WRITER_ROLES], ["ADMIN", "MANAGER"]);
assert.equal(isCompanyContactLinkWriterRole("ADMIN"), true);
assert.equal(isCompanyContactLinkWriterRole("MANAGER"), true);
assert.equal(isCompanyContactLinkWriterRole("SALES"), false);
assert.equal(isCompanyContactLinkWriterRole("VIEWER"), false);

assert.deepEqual([...BLOCKED_COMPANY_LINK_TRADE_STATUSES], ["NG", "NEEDS_REVIEW", "SUSPENDED"]);
for (const status of ["NG", "NEEDS_REVIEW", "SUSPENDED", " ng "]) {
  assert.equal(isBlockedCompanyLinkTradeStatus(status), true);
}
assert.equal(isBlockedCompanyLinkTradeStatus("OK"), false);
assert.equal(companyLinkTradeStatusReasonCode(" suspended "), "COMPANY_TRADE_STATUS_SUSPENDED");
assert.equal(companyLinkTradeStatusReasonCode("OK"), null);

assert(LINK_FORBIDDEN_RAW_PAYLOAD_KEYS.includes("rawMailBody"));
assert(LINK_FORBIDDEN_RAW_PAYLOAD_KEYS.includes("freeNote"));
assert(LINK_FORBIDDEN_RAW_PAYLOAD_KEYS.includes("customerData"));

const allowedPayloadKeys = new Set(["companyId", "contactId", "expectedUpdatedAt", "roleOrder"]);
assert.deepEqual(
  findUnsafeLinkPayloadField({ rawMailBody: "full mail body" }, allowedPayloadKeys),
  { kind: "unsupported-key", key: "rawMailBody" },
);
assert.deepEqual(
  findUnsafeLinkPayloadField({ freeNote: "manual note" }, allowedPayloadKeys),
  { kind: "unsupported-key", key: "freeNote" },
);
assert.deepEqual(
  findUnsafeLinkPayloadField({ customerData: "private customer data" }, allowedPayloadKeys),
  { kind: "unsupported-key", key: "customerData" },
);
assert.deepEqual(
  findUnsafeLinkPayloadField({ extraKey: "value" }, allowedPayloadKeys),
  { kind: "unsupported-key", key: "extraKey" },
);
assert.deepEqual(
  findUnsafeLinkPayloadField({ roleOrder: 1 }, allowedPayloadKeys, { extraForbiddenKeys: ["roleOrder"] }),
  { kind: "unsupported-key", key: "roleOrder" },
);
assert.deepEqual(
  findUnsafeLinkPayloadField({ expectedUpdatedAt: "owner@example.invalid" }, allowedPayloadKeys),
  { kind: "sensitive-value", key: "expectedUpdatedAt" },
);
assert.equal(
  findUnsafeLinkPayloadField({ companyId: "22222222-2222-4222-8222-222222222222" }, allowedPayloadKeys),
  null,
);

assert.deepEqual([...LINK_NON_PRODUCTION_WRITE_TARGETS], ["local", "test", "staging"]);
assert.equal(isAllowedNonProductionLinkWriteTarget("local"), true);
assert.equal(isAllowedNonProductionLinkWriteTarget("test"), true);
assert.equal(isAllowedNonProductionLinkWriteTarget("staging"), true);
assert.equal(isAllowedNonProductionLinkWriteTarget("production"), false);
assert.equal(isLinkProductionRuntime({}, "production"), true);
assert.equal(isLinkProductionRuntime({ NODE_ENV: "production" }, "staging"), true);
assert.equal(isLinkProductionRuntime({ VERCEL_ENV: "production" }, "local"), true);
assert.equal(isLinkProductionRuntime({ NODE_ENV: "development", VERCEL_ENV: "preview" }, "staging"), false);

console.log("link safety policy tests passed.");

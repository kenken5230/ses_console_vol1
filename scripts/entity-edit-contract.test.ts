import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PERSON_FORM_FIELD_NAMES,
  PERSON_FORM_INITIAL_VALUES,
  PERSON_UNSAVED_FUTURE_FIELD_NAMES
} from "../lib/person-form-contract";

const rootDir = process.cwd();

function readProjectFile(filePath: string) {
  return readFileSync(path.join(rootDir, filePath), "utf8");
}

function assertUnique(values: readonly string[], label: string) {
  assert.deepEqual([...new Set(values)], values, `${label} must not contain duplicate field names`);
}

function objectBodyFrom(source: string, startNeedle: string) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} was not found`);

  const objectStart = source.indexOf("{", start);
  assert.notEqual(objectStart, -1, `${startNeedle} object start was not found`);

  let depth = 0;
  for (let index = objectStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(objectStart + 1, index);
    }
  }

  throw new Error(`${startNeedle} object end was not found`);
}

function extractDashboardPersonFormValueNames(source: string) {
  const mapPersonStart = source.indexOf("function mapPerson");
  assert.notEqual(mapPersonStart, -1, "mapPerson must exist in dashboard-data route");

  const formValuesStart = source.indexOf("formValues: mergePersonFormInitialValues", mapPersonStart);
  assert.notEqual(formValuesStart, -1, "mapPerson formValues must use mergePersonFormInitialValues");

  const body = objectBodyFrom(source.slice(formValuesStart), "mergePersonFormInitialValues");
  return [...body.matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*):/gm)].map((match) => match[1]);
}

const dashboardSource = readProjectFile("app/api/dashboard-data/route.ts");
const drawerSource = readProjectFile("components/PersonCreateDrawer.jsx");
const personsApiSource = readProjectFile("app/api/persons/route.ts");
const docsSource = readProjectFile("docs/themes/ses-sales-console/requirements/entity-edit-contract-2026-06-20.md");

const formFieldNames: string[] = [...PERSON_FORM_FIELD_NAMES];
const initialValueNames = Object.keys(PERSON_FORM_INITIAL_VALUES);
const dashboardFormValueNames = extractDashboardPersonFormValueNames(dashboardSource);

assertUnique(formFieldNames, "Person form contract");
assert.deepEqual(formFieldNames, initialValueNames, "Person form field names must match initial value names");
assert.deepEqual(formFieldNames, dashboardFormValueNames, "Person drawer fields must match dashboard person.formValues fields");

assert(drawerSource.includes("initialValues"), "PersonCreateDrawer must accept initialValues before edit mode is enabled");
assert(
  drawerSource.includes("PERSON_FORM_FIELD_GROUPS") && drawerSource.includes("mergePersonFormInitialValues"),
  "PersonCreateDrawer must render from the shared person form contract"
);
assert(drawerSource.includes('method: "POST"'), "PersonCreateDrawer save behavior must remain POST-only in this PR");
assert(!drawerSource.includes('method: "PATCH"'), "PersonCreateDrawer must not enable PATCH in this PR");
assert(!personsApiSource.includes("export async function PATCH"), "PATCH /api/persons must not be introduced in this PR");

assert(
  PERSON_UNSAVED_FUTURE_FIELD_NAMES.includes("processes"),
  "processes must stay documented as an unsaved future person field"
);
assert(!formFieldNames.includes("processes"), "processes must not be a saved drawer/API field until storage is decided");
assert(!dashboardFormValueNames.includes("processes"), "processes must not appear saved in dashboard person.formValues");
assert(docsSource.includes("processes") && docsSource.includes("未保存"), "docs must document processes as unsaved");
assert(docsSource.includes("PATCH /api/persons") && docsSource.includes("会社/担当者CRUD API"), "docs must record write API boundaries");

console.log("entity edit contract tests passed.");

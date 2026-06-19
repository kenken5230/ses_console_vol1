import assert from "node:assert/strict";
import {
  InputValidationError,
  parseDateInput,
  parseEmailInput,
  parseMonthInput,
  parseNumberInput,
  parseRemoteTypeInput,
  parseSelectInput,
  splitListInput
} from "../lib/input-standard-validation";

function assertValidation(fn: () => unknown, pattern: RegExp) {
  assert.throws(
    fn,
    (error) => error instanceof InputValidationError && pattern.test(error.message)
  );
}

assert.equal(parseNumberInput("1,200", "単価"), 1200);
assertValidation(() => parseNumberInput("八十", "単価"), /単価は数値で入力してください/);

assert.equal(parseMonthInput("2026-06", "開始月")?.toISOString(), "2026-06-01T00:00:00.000Z");
assertValidation(() => parseMonthInput("2026/06", "開始月"), /開始月はYYYY-MM形式/);

assert.equal(parseDateInput("2026-06-19", "作成日")?.toISOString(), "2026-06-19T00:00:00.000Z");
assertValidation(() => parseDateInput("2026/06/19", "作成日"), /作成日はYYYY-MM-DD形式/);

assert.equal(parseEmailInput("sales@example.com", "担当者メール"), "sales@example.com");
assertValidation(() => parseEmailInput("sales at example.com", "担当者メール"), /担当者メールはメールアドレス形式/);

const statusMap = {
  提案可: "AVAILABLE",
  提案中: "PROPOSING",
  参画中: "JOINED",
  停止: "INACTIVE"
} as const;

assert.equal(parseSelectInput("提案中", "状態", statusMap, "AVAILABLE"), "PROPOSING");
assert.equal(parseSelectInput(undefined, "状態", statusMap, "AVAILABLE"), "AVAILABLE");
assertValidation(() => parseSelectInput("確認中", "状態", statusMap, "AVAILABLE"), /状態は次のいずれかを選択してください/);

assert.equal(parseRemoteTypeInput("リモート併用"), "HYBRID");
assert.equal(parseRemoteTypeInput(undefined, "東京都 フルリモート"), "FULL_REMOTE");
assert.equal(parseRemoteTypeInput("", "週3出社 週2リモート"), "HYBRID");
assert.equal(parseRemoteTypeInput("", "オンサイト"), "ONSITE");
assertValidation(() => parseRemoteTypeInput("在宅多め"), /リモート条件は次のいずれかを選択してください/);

assert.deepEqual(splitListInput("Java、TypeScript\nAWS / SQL"), ["Java", "TypeScript", "AWS", "SQL"]);

console.log("input standard validation tests passed.");

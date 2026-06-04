import {
  csvSourceApplyHelpText,
  runCsvSourceApply,
} from "./csv-import-dry-run";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(csvSourceApplyHelpText());
} else {
  runCsvSourceApply()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

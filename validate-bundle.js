"use strict";

const {
  buildRuntime,
  compareCounts,
  computeSourceFingerprint,
  loadValidationReport,
  validateReportStructure,
} = require("./scripts/validation-lib");

function main() {
  const errors = [];
  let report;
  let runtime;

  try {
    report = loadValidationReport();
    errors.push(...validateReportStructure(report));
  } catch (error) {
    errors.push(`could not load validation-report.json: ${error.message}`);
  }

  if (report) {
    const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
    if (nodeMajor < report.minimum_node_major) {
      errors.push(
        `validation requires Node ${report.minimum_node_major}+, received ${process.versions.node}`,
      );
    }
    try {
      const sourceFingerprint = computeSourceFingerprint();
      if (sourceFingerprint !== report.source_fingerprint) {
        errors.push(
          `validation baseline fingerprint is stale; run npm run update:manifest (expected ${report.source_fingerprint}, received ${sourceFingerprint})`,
        );
      }
    } catch (error) {
      errors.push(`could not compute validation source fingerprint: ${error.message}`);
    }
  }

  try {
    runtime = buildRuntime();
  } catch (error) {
    errors.push(`could not build runtime cards: ${error.stack || error.message}`);
  }

  if (report?.expected_counts && runtime?.counts) {
    errors.push(...compareCounts(runtime.counts, report.expected_counts));
  }

  if (errors.length) {
    console.error(`Bundle validation failed with ${errors.length} issue(s):`);
    errors.forEach((error, index) => console.error(`${index + 1}. ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        manifest: "validation-report.json",
        artifact_type: report.artifact_type,
        status: "source fingerprint and runtime counts match the committed baseline",
        counts: runtime.counts,
      },
      null,
      2,
    ),
  );
}

main();

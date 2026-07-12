import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadRepositoryEnv } from "./env.js";

test("loads an ignored repository .env without overriding existing variables", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pawproof-seo-env-"));
  fs.writeFileSync(
    path.join(directory, ".env"),
    "PAWPROOF_SEO_TEST_LOGIN=from-file\nPAWPROOF_SEO_TEST_PASSWORD=from-file\n",
    "utf8",
  );
  process.env.PAWPROOF_SEO_TEST_PASSWORD = "from-environment";

  try {
    assert.equal(loadRepositoryEnv(directory), path.join(directory, ".env"));
    assert.equal(process.env.PAWPROOF_SEO_TEST_LOGIN, "from-file");
    assert.equal(process.env.PAWPROOF_SEO_TEST_PASSWORD, "from-environment");
  } finally {
    delete process.env.PAWPROOF_SEO_TEST_LOGIN;
    delete process.env.PAWPROOF_SEO_TEST_PASSWORD;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

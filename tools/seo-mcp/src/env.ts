import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

function mainCheckoutEnv(cwd: string): string | null {
  try {
    const commonGitDirectory = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true },
    ).trim();
    return path.resolve(commonGitDirectory, "..", ".env");
  } catch {
    return null;
  }
}

export function loadRepositoryEnv(cwd = process.cwd()): string | null {
  const candidates = [path.resolve(cwd, ".env"), mainCheckoutEnv(cwd)].filter(
    (candidate): candidate is string => candidate !== null,
  );

  for (const candidate of new Set(candidates)) {
    if (!fs.existsSync(candidate)) continue;
    const values = parseEnv(fs.readFileSync(candidate, "utf8"));
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return candidate;
  }
  return null;
}

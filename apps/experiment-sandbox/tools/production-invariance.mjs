import { createHash } from "node:crypto";

export const compareStrings = (left, right) =>
  left.localeCompare(right, "en-US", { sensitivity: "variant", numeric: false });

export const compareTupleKeys = ([left], [right]) => compareStrings(left, right);

export function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeSeparators(value) {
  return value.replaceAll("\\", "/");
}

function isWindowsAbsolutePath(value) {
  return /^[A-Za-z]:\//.test(value);
}

function isAbsolutePath(value) {
  return value.startsWith("/") || isWindowsAbsolutePath(value);
}

function isCaseInsensitivePath(value) {
  return isWindowsAbsolutePath(value);
}

function pathsEqual(left, right) {
  return isCaseInsensitivePath(left) || isCaseInsensitivePath(right)
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function pathStartsWithRoot(value, root) {
  const normalizedValue = isCaseInsensitivePath(root) ? value.toLowerCase() : value;
  const normalizedRoot = isCaseInsensitivePath(root) ? root.toLowerCase() : root;
  return normalizedValue.startsWith(`${normalizedRoot}/`);
}

function collapseRelativePath(value) {
  const parts = value.split("/");
  const collapsed = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (collapsed.length === 0) return null;
      collapsed.pop();
      continue;
    }
    collapsed.push(part);
  }
  return collapsed.join("/");
}

function repositoryRelativePath(entry, repositoryRoot) {
  if (typeof entry !== "string" || entry.length === 0) return null;
  const normalizedEntry = normalizeSeparators(entry);
  const normalizedRoot = normalizeSeparators(repositoryRoot).replace(/\/+$/, "");

  if (isAbsolutePath(normalizedEntry)) {
    if (pathsEqual(normalizedEntry, normalizedRoot)) return "";
    if (!pathStartsWithRoot(normalizedEntry, normalizedRoot)) return null;
    return normalizedEntry.slice(normalizedRoot.length + 1);
  }

  return normalizedEntry.replace(/^\.\//, "");
}

/**
 * Canonicalizes generated file-list entries without dropping production files.
 * Absolute entries must be inside the repository root; all other entries are
 * treated as repository-relative and normalized for cross-platform hashing.
 */
export function canonicalizeRepositoryPaths(entries, repositoryRoot) {
  const canonical = entries.map((entry) => {
    const repositoryRelative = repositoryRelativePath(entry, repositoryRoot);
    const collapsed = repositoryRelative === null
      ? null
      : collapseRelativePath(repositoryRelative);
    if (collapsed === null) {
      throw new Error("SBX_INVARIANCE_DENIED:REQUIRED_SERVER_PATH_OUTSIDE_REPOSITORY");
    }
    return collapsed;
  });
  return canonical.sort(compareStrings);
}

export function assertNoSandboxFiles(entries) {
  const containsSandboxFile = entries.some((entry) => {
    const normalized = entry.toLowerCase();
    return normalized.includes("sandbox");
  });
  if (containsSandboxFile) {
    throw new Error("SBX_INVARIANCE_DENIED:SANDBOX_FILE_IN_REQUIRED_SERVER_FILES");
  }
}

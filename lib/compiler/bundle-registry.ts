export const COMPILER_BUNDLE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.COMPILER_BUNDLE_URL || "/compiler-bundle.zip"
    : "/compiler-bundle.zip";

export const COMPILER_BUNDLE_VERSION = "2026-09-12-v1";

export const COMPILER_BINARY_ASSETS = [
  "engine/busytex.js",
  "engine/busytex.wasm",
  "engine/busytex_pipeline.js",
  "packages/texlive-basic.js",
  "packages/texlive-basic.data",
] as const;

export type CompilerBinaryAsset = (typeof COMPILER_BINARY_ASSETS)[number];

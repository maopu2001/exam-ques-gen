import { unzipSync } from "fflate";
import {
  formatBytes,
  formatSpeed,
  saveFontToDB,
} from "@/lib/compiler/asset-cache";
import { saveBinaryAssetsToDB } from "@/lib/compiler/binary-cache";
import { COMPILER_BUNDLE_URL } from "@/lib/compiler/bundle-registry";
import { saveStylesToDB } from "@/lib/compiler/styles-cache";

const ctx: Worker = self as unknown as Worker;

ctx.addEventListener("message", async (event: MessageEvent) => {
  const { type, id } = event.data;
  if (type !== "START_DOWNLOAD") return;

  try {
    ctx.postMessage({
      type: "DOWNLOAD_PROGRESS",
      id,
      percent: 2,
      speed: "",
      message: "Connecting to server...",
    });

    const bundleResponse = await fetch(COMPILER_BUNDLE_URL);
    if (!bundleResponse.ok) {
      throw new Error(
        `Compiler bundle download failed: HTTP ${bundleResponse.status}`,
      );
    }

    const contentLengthHeader = bundleResponse.headers.get("content-length");
    const totalBytes = contentLengthHeader
      ? parseInt(contentLengthHeader, 10)
      : 48 * 1024 * 1024;

    let bundleBuffer: Uint8Array;

    if (bundleResponse.body && typeof ReadableStream !== "undefined") {
      const reader = bundleResponse.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      const startTime = Date.now();
      let lastReportTime = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          const now = Date.now();
          if (now - lastReportTime > 60 || receivedBytes === totalBytes) {
            lastReportTime = now;
            const elapsedSec = (now - startTime) / 1000;
            const speed =
              elapsedSec > 0 ? formatSpeed(receivedBytes / elapsedSec) : "";
            const downloadRatio = Math.min(1, receivedBytes / totalBytes);
            // Download phase: 5% -> 85%
            const percent = Math.min(85, Math.floor(5 + downloadRatio * 80));

            ctx.postMessage({
              type: "DOWNLOAD_PROGRESS",
              id,
              percent,
              speed,
              message: `Downloading TeX bundle (${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)})...`,
            });
          }
        }
      }

      bundleBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        bundleBuffer.set(chunk, offset);
        offset += chunk.length;
      }
    } else {
      ctx.postMessage({
        type: "DOWNLOAD_PROGRESS",
        id,
        percent: 45,
        speed: "",
        message: "Downloading TeX bundle...",
      });
      bundleBuffer = new Uint8Array(await bundleResponse.arrayBuffer());
    }

    ctx.postMessage({
      type: "DOWNLOAD_PROGRESS",
      id,
      percent: 88,
      speed: "",
      message: "Unpacking TeX Live WebAssembly bundle...",
    });

    const archive = unzipSync(bundleBuffer);
    const manifestBytes = archive["manifest.json"];
    if (!manifestBytes) throw new Error("Compiler bundle manifest is missing.");
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    if (manifest.schema !== "exam-studio-compiler-bundle") {
      throw new Error("Unsupported compiler bundle schema.");
    }

    ctx.postMessage({
      type: "DOWNLOAD_PROGRESS",
      id,
      percent: 94,
      speed: "",
      message: "Saving TeX assets to offline cache...",
    });

    const styles: Record<string, string> = {};
    const binaryAssets: Record<string, Uint8Array> = {};
    for (const file of manifest.files as Array<{
      path: string;
      type: string;
    }>) {
      const bytes = archive[file.path];
      if (!bytes)
        throw new Error(`Compiler bundle entry is missing: ${file.path}`);
      if (file.path.startsWith("tex/")) {
        styles[file.path.slice(4)] = new TextDecoder().decode(bytes);
      } else {
        binaryAssets[file.path] = bytes;
      }
    }

    const fontBytes = binaryAssets["font/Kalpurush.ttf"];
    if (!fontBytes)
      throw new Error("Kalpurush font is missing from compiler bundle.");
    await saveFontToDB(fontBytes);
    delete binaryAssets["font/Kalpurush.ttf"];
    await saveStylesToDB(styles);
    await saveBinaryAssetsToDB(binaryAssets, manifest.version);

    ctx.postMessage({
      type: "DOWNLOAD_PROGRESS",
      id,
      percent: 100,
      speed: "",
      message: "TeX Live engine ready",
    });

    ctx.postMessage({
      type: "DOWNLOAD_COMPLETE",
      id,
    });
  } catch (err: any) {
    ctx.postMessage({
      type: "DOWNLOAD_ERROR",
      id,
      error: err?.message || String(err),
    });
  }
});

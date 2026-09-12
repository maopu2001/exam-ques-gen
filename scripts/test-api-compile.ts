import fs from "node:fs";
import path from "node:path";
import { POST } from "../app/api/compile/route";
import { NextRequest } from "next/server";

async function testApiRoute() {
  console.log("Testing POST /api/compile with XeLaTeX engine...");

  const jsonPath = path.join(process.cwd(), "LATEX_CODE", "exam_data.json");
  const rawJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const req = new NextRequest("http://localhost:3000/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonInput: rawJson,
      options: { setName: "ক", shuffleMcq: false },
    }),
  });

  const res = await POST(req);
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error("API compilation failed: " + data.error);
  }

  const masterBytes = Buffer.from(data.masterPdfBase64, "base64");
  console.log("✓ API Compile SUCCESS!");
  console.log(`✓ Generated Master PDF Size: ${(masterBytes.length / 1024).toFixed(1)} KB`);
  console.log(`✓ Reported Page Count: ${data.pageCount}`);
  console.log(`✓ Compilation Duration: ${(data.durationMs / 1000).toFixed(2)}s`);
  console.log(`✓ Log entries captured: ${data.logs.length}`);
}

testApiRoute().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

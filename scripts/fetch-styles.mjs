import { execFileSync } from "node:child_process";
import { zipSync } from "fflate";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const stylesDirectory = join(process.cwd(), "public", "styles");
const bundlePath = join(process.cwd(), "public", "compiler-bundle.zip");
mkdirSync(stylesDirectory, { recursive: true });

const BUSYTEX_BASE = "https://texlyre.github.io/texlyre-busytex/core/busytex";
const KALPURUSH_URL = "https://fonts.maateen.me/kalpurush/Kalpurush-v0.258.ttf";

const FALLBACK_STYLES = {
  "makecell.sty":
    "\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesPackage{makecell}[2025/01/01 Exam Studio compatibility]\n\\newcommand{\\makecell}[2][]{\\begin{tabular}{c}#2\\end{tabular}}\n",
  "booktabs.sty":
    "\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesPackage{booktabs}[2025/01/01 Exam Studio compatibility]\n\\newcommand{\\toprule}{\\hline}\n\\newcommand{\\midrule}{\\hline}\n\\newcommand{\\bottomrule}{\\hline}\n",
};

const directFiles = {
  "enumitem.sty":
    "https://mirrors.ctan.org/macros/latex/contrib/enumitem/enumitem.sty",
  "titlesec.sty":
    "https://mirrors.ctan.org/macros/latex/contrib/titlesec/titlesec.sty",
};

const polyglossiaFiles = [
  "polyglossia/tex/polyglossia.sty",
  "polyglossia/tex/bengalidigits.sty",
  "polyglossia/tex/devanagaridigits.sty",
  "polyglossia/tex/gloss-bengali.ldf",
  "polyglossia/tex/gloss-english.ldf",
  "polyglossia/tex/gloss-latex.ldf",
  "polyglossia/tex/babelsh.def",
];

async function downloadText(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  return response.text();
}

async function downloadBytes(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function extractArchiveFiles(url, entries) {
  const directory = mkdtempSync(join(tmpdir(), "exam-studio-style-"));
  const archivePath = join(directory, "styles.zip");
  try {
    writeFileSync(archivePath, Buffer.from(await downloadBytes(url)));
    execFileSync(
      "unzip",
      ["-j", "-o", archivePath, ...entries, "-d", stylesDirectory],
      {
        stdio: "ignore",
      },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function generateDtxFiles(url, archiveEntries, installer, outputFiles) {
  const directory = mkdtempSync(join(tmpdir(), "exam-studio-dtx-"));
  const archivePath = join(directory, "source.zip");
  try {
    writeFileSync(archivePath, Buffer.from(await downloadBytes(url)));
    execFileSync(
      "unzip",
      ["-j", "-o", archivePath, ...archiveEntries, "-d", directory],
      {
        stdio: "ignore",
      },
    );
    writeFileSync(join(directory, "install.ins"), installer);
    execFileSync("latex", ["-interaction=batchmode", "install.ins"], {
      cwd: directory,
      stdio: "ignore",
    });
    for (const filename of outputFiles) {
      writeFileSync(
        join(stylesDirectory, filename),
        readFileSync(join(directory, filename)),
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const [filename, url] of Object.entries(directFiles)) {
  writeFileSync(join(stylesDirectory, filename), await downloadText(url));
}

const geometryDirectory = mkdtempSync(join(tmpdir(), "exam-studio-geometry-"));
try {
  const geometryArchive = join(geometryDirectory, "geometry.zip");
  writeFileSync(
    geometryArchive,
    Buffer.from(
      await downloadBytes(
        "https://mirrors.ctan.org/macros/latex/contrib/geometry.zip",
      ),
    ),
  );
  execFileSync(
    "unzip",
    [
      "-j",
      "-o",
      geometryArchive,
      "geometry/geometry.dtx",
      "-d",
      geometryDirectory,
    ],
    { stdio: "ignore" },
  );
  writeFileSync(
    join(geometryDirectory, "geometry.ins"),
    "\\input docstrip.tex\n\\keepsilent\n\\generate{\\file{geometry.sty}{\\from{geometry.dtx}{package}}}\n\\endbatchfile\n",
  );
  execFileSync("latex", ["-interaction=batchmode", "geometry.ins"], {
    cwd: geometryDirectory,
    stdio: "ignore",
  });
  writeFileSync(
    join(stylesDirectory, "geometry.sty"),
    readFileSync(join(geometryDirectory, "geometry.sty")),
  );
} finally {
  rmSync(geometryDirectory, { recursive: true, force: true });
}

const pgfplotsDirectory = mkdtempSync(join(tmpdir(), "exam-studio-pgfplots-"));
const pgfplotsArchivePath = join(pgfplotsDirectory, "pgfplots.zip");
try {
  const response = await fetch(
    "https://mirrors.ctan.org/graphics/pgf/contrib/pgfplots.zip",
  );
  if (!response.ok)
    throw new Error(`Failed to download pgfplots: HTTP ${response.status}`);
  writeFileSync(pgfplotsArchivePath, Buffer.from(await response.arrayBuffer()));
  execFileSync(
    "unzip",
    [
      "-j",
      "-o",
      pgfplotsArchivePath,
      "pgfplots/tex/*",
      "-d",
      stylesDirectory,
    ],
    { stdio: "ignore" },
  );
} finally {
  rmSync(pgfplotsDirectory, { recursive: true, force: true });
}

await extractArchiveFiles(
  "https://mirrors.ctan.org/macros/latex/contrib/tasks.zip",
  ["tasks/tasks.sty", "tasks/tasks.cfg"],
);
await generateDtxFiles(
  "https://mirrors.ctan.org/macros/latex/contrib/xkeyval.zip",
  ["xkeyval/xkeyval.dtx"],
  `\\input docstrip.tex
\\keepsilent
\\generate{
  \\file{xkeyval.tex}{\\from{xkeyval.dtx}{xkvtex}}
  \\file{xkeyval.sty}{\\from{xkeyval.dtx}{xkvlatex}}
  \\file{xkvview.sty}{\\from{xkeyval.dtx}{xkvview}}
  \\file{xkvltxp.sty}{\\from{xkeyval.dtx}{xkvltxpatch}}
  \\file{keyval.tex}{\\from{xkeyval.dtx}{xkvkeyval}}
  \\file{xkvtxhdr.tex}{\\from{xkeyval.dtx}{xkvheader}}
  \\file{xkvutils.tex}{\\from{xkeyval.dtx}{xkvutils}}
  \\file{pst-xkey.tex}{\\from{xkeyval.dtx}{pxktex}}
  \\file{pst-xkey.sty}{\\from{xkeyval.dtx}{pxklatex}}
}
\\endbatchfile
`,
  [
    "xkeyval.tex",
    "xkeyval.sty",
    "xkvview.sty",
    "xkvltxp.sty",
    "keyval.tex",
    "xkvtxhdr.tex",
    "xkvutils.tex",
    "pst-xkey.tex",
    "pst-xkey.sty",
  ],
);
await extractArchiveFiles(
  "https://mirrors.ctan.org/install/macros/latex/contrib/etoolbox.tds.zip",
  ["tex/latex/etoolbox/etoolbox.sty"],
);
writeFileSync(
  join(stylesDirectory, "iftex.sty"),
  await downloadText(
    "https://raw.githubusercontent.com/latex3/iftex/main/iftex.sty",
  ),
);
await generateDtxFiles(
  "https://mirrors.ctan.org/macros/latex/contrib/oberdiek.zip",
  ["oberdiek/centernot.dtx"],
  "\\input docstrip.tex\n\\keepsilent\n\\generate{\\file{centernot.sty}{\\from{centernot.dtx}{package}}}\n\\endbatchfile\n",
  ["centernot.sty"],
);
await generateDtxFiles(
  "https://mirrors.ctan.org/macros/generic/kastrup.zip",
  ["kastrup/binhex.dtx"],
  "\\input docstrip.tex\n\\keepsilent\n\\generate{\\file{binhex.tex}{\\from{binhex.dtx}{package}}}\n\\endbatchfile\n",
  ["binhex.tex"],
);

const xcolorDirectory = mkdtempSync(join(tmpdir(), "exam-studio-xcolor-"));
const xcolorArchivePath = join(xcolorDirectory, "xcolor.zip");
try {
  const response = await fetch(
    "https://mirrors.ctan.org/macros/latex/contrib/xcolor.zip",
  );
  if (!response.ok)
    throw new Error(
      `Failed to download xcolor archive: HTTP ${response.status}`,
    );
  writeFileSync(xcolorArchivePath, Buffer.from(await response.arrayBuffer()));
  const xcolorContent = execFileSync(
    "unzip",
    ["-p", xcolorArchivePath, "xcolor/xcolor-2022-06-12.sty"],
    { encoding: "utf8" },
  ).replace(
    "\\ProvidesPackage{xcolor-2022-06-12}",
    "\\ProvidesPackage{xcolor}",
  );
  writeFileSync(join(stylesDirectory, "xcolor.sty"), xcolorContent);
} finally {
  rmSync(xcolorDirectory, { recursive: true, force: true });
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "exam-studio-fontspec-"));
const archivePath = join(temporaryDirectory, "fontspec.tds.zip");
try {
  const response = await fetch(
    "https://mirrors.ctan.org/install/macros/unicodetex/latex/fontspec.tds.zip",
  );
  if (!response.ok)
    throw new Error(
      `Failed to download fontspec archive: HTTP ${response.status}`,
    );
  writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()));
  execFileSync(
    "unzip",
    [
      "-j",
      "-o",
      archivePath,
      "tex/latex/fontspec/fontspec.sty",
      "tex/latex/fontspec/fontspec-xetex.sty",
      "tex/latex/fontspec/fontspec.cfg",
      "-d",
      stylesDirectory,
    ],
    { stdio: "ignore" },
  );
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

const pgfDirectory = mkdtempSync(join(tmpdir(), "exam-studio-pgf-"));
const pgfArchivePath = join(pgfDirectory, "pgf-base.zip");
try {
  const response = await fetch(
    "https://mirrors.ctan.org/graphics/pgf/base.zip",
  );
  if (!response.ok)
    throw new Error(`Failed to download PGF archive: HTTP ${response.status}`);
  writeFileSync(pgfArchivePath, Buffer.from(await response.arrayBuffer()));
  execFileSync(
    "unzip",
    [
      "-j",
      "-o",
      pgfArchivePath,
      "base/tex/generic/pgf/*",
      "base/tex/latex/pgf/*",
      "-d",
      stylesDirectory,
    ],
    { stdio: "ignore" },
  );
  const archiveEntries = execFileSync("unzip", ["-Z1", pgfArchivePath], {
    encoding: "utf8",
  });
  const pgfManifest = [
    ...new Set(
      archiveEntries
        .split("\n")
        .filter(
          (entry) =>
            (entry.startsWith("base/tex/generic/pgf/") ||
              entry.startsWith("base/tex/latex/pgf/")) &&
            !entry.endsWith("/"),
        )
        .map((entry) => entry.split("/").pop()),
    ),
  ];
  writeFileSync(
    join(stylesDirectory, "pgf-manifest.json"),
    JSON.stringify(pgfManifest),
  );
} finally {
  rmSync(pgfDirectory, { recursive: true, force: true });
}

const polyglossiaDirectory = mkdtempSync(
  join(tmpdir(), "exam-studio-polyglossia-"),
);
const polyglossiaArchivePath = join(polyglossiaDirectory, "polyglossia.zip");
try {
  const response = await fetch(
    "https://mirrors.ctan.org/macros/unicodetex/latex/polyglossia.zip",
  );
  if (!response.ok)
    throw new Error(
      `Failed to download polyglossia archive: HTTP ${response.status}`,
    );
  writeFileSync(
    polyglossiaArchivePath,
    Buffer.from(await response.arrayBuffer()),
  );
  execFileSync(
    "unzip",
    [
      "-j",
      "-o",
      polyglossiaArchivePath,
      ...polyglossiaFiles,
      "-d",
      stylesDirectory,
    ],
    { stdio: "ignore" },
  );
} finally {
  rmSync(polyglossiaDirectory, { recursive: true, force: true });
}

for (const filename of [
  "geometry.sty",
  "enumitem.sty",
  "titlesec.sty",
  "fontspec.sty",
  "fontspec-xetex.sty",
  "fontspec.cfg",
  "polyglossia.sty",
  "bengalidigits.sty",
  "devanagaridigits.sty",
  "pgfplots.sty",
  "tasks.sty",
  "xkeyval.sty",
  "etoolbox.sty",
  "iftex.sty",
  "centernot.sty",
  "gloss-bengali.ldf",
  "gloss-english.ldf",
  "gloss-latex.ldf",
  "babelsh.def",
  "tikz.sty",
  "xcolor.sty",
]) {
  const content = readFileSync(join(stylesDirectory, filename), "utf8");
  if (
    !content.includes("\\Provides") &&
    !content.includes("\\defaultfontfeatures") &&
    !content.includes("\\RequirePackage{pgf")
  ) {
    throw new Error(`Generated ${filename} is not a valid TeX style file`);
  }
}

for (const filename of [
  "xkeyval.tex",
  "xkvutils.tex",
  "xkvtxhdr.tex",
  "binhex.tex",
]) {
  if (!readFileSync(join(stylesDirectory, filename), "utf8").trim()) {
    throw new Error(`Generated ${filename} is empty`);
  }
}

for (const [filename, content] of Object.entries(FALLBACK_STYLES)) {
  writeFileSync(join(stylesDirectory, filename), content);
}

const bundleFiles = {};
for (const filename of readdirSync(stylesDirectory)) {
  if (filename === "pgf-manifest.json") continue;
  bundleFiles[`tex/${filename}`] = readFileSync(
    join(stylesDirectory, filename),
  );
}

const binaryAssets = {
  "font/Kalpurush.ttf": await downloadBytes(KALPURUSH_URL),
  "engine/busytex.js": await downloadBytes(`${BUSYTEX_BASE}/busytex.js`),
  "engine/busytex.wasm": await downloadBytes(`${BUSYTEX_BASE}/busytex.wasm`),
  "engine/busytex_pipeline.js": await downloadBytes(
    `${BUSYTEX_BASE}/busytex_pipeline.js`,
  ),
  "packages/texlive-basic.js": await downloadBytes(
    `${BUSYTEX_BASE}/texlive-basic.js`,
  ),
  "packages/texlive-basic.data": await downloadBytes(
    `${BUSYTEX_BASE}/texlive-basic.data`,
  ),
};

Object.assign(bundleFiles, binaryAssets);
const manifest = {
  schema: "exam-studio-compiler-bundle",
  version: "2026-09-12-v1",
  files: Object.entries(bundleFiles).map(([path, bytes]) => ({
    path,
    type: path.startsWith("tex/") ? "text" : "binary",
    bytes: bytes.byteLength,
  })),
};
bundleFiles["manifest.json"] = new TextEncoder().encode(
  JSON.stringify(manifest),
);
writeFileSync(bundlePath, zipSync(bundleFiles, { level: 6 }));
rmSync(stylesDirectory, { recursive: true, force: true });

console.log("Removed temporary public/styles staging directory");
console.log(`Generated compiler bundle: ${bundlePath}`);

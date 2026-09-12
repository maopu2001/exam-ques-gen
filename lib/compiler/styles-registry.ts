export interface StyleAsset {
  filename: string;
  url?: string;
  fallback?: string;
}

// Direct files are used only where the package repository exposes that file.
// makecell and booktabs publish .dtx sources on CTAN, so these small fallbacks
// cover the commands used by this application without pretending a .sty URL exists.
export const STYLE_ASSETS: StyleAsset[] = [
  {
    filename: "makecell.sty",
    fallback: `\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesPackage{makecell}[2025/01/01 Exam Studio compatibility]\n\\newcommand{\\makecell}[2][]{\\begin{tabular}{c}#2\\end{tabular}}\n`,
  },
  {
    filename: "booktabs.sty",
    fallback: `\\NeedsTeXFormat{LaTeX2e}\n\\ProvidesPackage{booktabs}[2025/01/01 Exam Studio compatibility]\n\\newcommand{\\toprule}{\\hline}\n\\newcommand{\\midrule}{\\hline}\n\\newcommand{\\bottomrule}{\\hline}\n`,
  },
  {
    filename: "enumitem.sty",
    url: "/styles/enumitem.sty",
  },
  {
    filename: "titlesec.sty",
    url: "/styles/titlesec.sty",
  },
  {
    filename: "fontspec.sty",
    url: "/styles/fontspec.sty",
  },
  {
    filename: "fontspec-xetex.sty",
    url: "/styles/fontspec-xetex.sty",
  },
  {
    filename: "fontspec.cfg",
    url: "/styles/fontspec.cfg",
  },
  {
    filename: "polyglossia.sty",
    url: "/styles/polyglossia.sty",
  },
  {
    filename: "gloss-bengali.ldf",
    url: "/styles/gloss-bengali.ldf",
  },
  {
    filename: "gloss-english.ldf",
    url: "/styles/gloss-english.ldf",
  },
  {
    filename: "gloss-latex.ldf",
    url: "/styles/gloss-latex.ldf",
  },
  {
    filename: "babelsh.def",
    url: "/styles/babelsh.def",
  },
  {
    filename: "tikz.sty",
    url: "/styles/tikz.sty",
  },
  {
    filename: "xcolor.sty",
    url: "/styles/xcolor.sty",
  },
  {
    filename: "geometry.sty",
    url: "/styles/geometry.sty",
  },
  {
    filename: "iftex.sty",
    url: "/styles/iftex.sty",
  },
  {
    filename: "xkeyval.sty",
    url: "/styles/xkeyval.sty",
  },
  {
    filename: "xkeyval.tex",
    url: "/styles/xkeyval.tex",
  },
  {
    filename: "xkvutils.tex",
    url: "/styles/xkvutils.tex",
  },
  {
    filename: "xkvtxhdr.tex",
    url: "/styles/xkvtxhdr.tex",
  },
  {
    filename: "bengalidigits.sty",
    url: "/styles/bengalidigits.sty",
  },
  {
    filename: "devanagaridigits.sty",
    url: "/styles/devanagaridigits.sty",
  },
];

export const STYLE_FILENAMES = STYLE_ASSETS.map(({ filename }) => filename);

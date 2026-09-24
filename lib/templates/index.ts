export const PREAMBLE_TEX = `% ==============================================================================
% LATEX PREAMBLE & STYLING DEFINITIONS
% Bengali OpenType Font: Kalpurush.ttf
% Compatible with XeLaTeX & WebAssembly TeX Live
% ==============================================================================

\\usepackage{geometry}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{fontspec}
\\usepackage{polyglossia}
\\usepackage{tabularx,booktabs,array,makecell}
\\usepackage{enumitem}
\\usepackage{multicol}
\\usepackage{titlesec}
\\usepackage{calc}
\\usepackage{ifthen}
\\usepackage{tikz}

% --- Language & Font Setup (XeLaTeX) ---
\\setdefaultlanguage{bengali}
\\setotherlanguage{english}

\\defaultfontfeatures{Ligatures=TeX}

% Load Kalpurush directly by filename from MEMFS root directory
\\setmainfont{Kalpurush.ttf}[
    Path = ./,
    Script=Bengali,
    AutoFakeBold=2.0,
    AutoFakeSlant=0.2
]

\\newfontfamily\\englishfont{Kalpurush.ttf}[
    Path = ./,
    AutoFakeBold=2.0,
    AutoFakeSlant=0.2
]
\\newcommand{\\en}[1]{{\\englishfont #1}}

% --- Bangladeshi NCTB Math Operator Standards ---
\\DeclareMathOperator{\\cosec}{cosec}
\\let\\csc\\cosec

% --- Disable Word Hyphenation Globally (Words never split with hyphens) ---
\\hyphenpenalty=10000
\\exhyphenpenalty=10000

% --- Allow Math Formulas to Wrap at Natural Operators (+, -, =, \\times) ---
\\binoppenalty=700
\\relpenalty=500
\\sloppy

% --- Spacing & Page Settings (Single Master Stretch & Hybrid Bottom Spring) ---
\\pagestyle{empty}
\\makeatletter
\\def\\@textbottom{\\vskip \\z@ \\@plus 60pt}
\\makeatother
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1.5pt plus 1pt minus 0.5pt}

% --- Single Master Max-Stretch Variable ---
\\newlength{\\maxitemstretch}
\\setlength{\\maxitemstretch}{4pt}

% --- Column Widths for Borderless 3-Column CQ Layout ---
\\newlength{\\labelcolwidth}
\\setlength{\\labelcolwidth}{16pt}
\\newlength{\\markscolwidth}
\\setlength{\\markscolwidth}{16pt}

% --- Header Formatting Commands ---
\\newcommand{\\examheader}[5]{%
  \\noindent\\begin{minipage}{\\linewidth}%
  \\begin{center}
    {\\bfseries\\large #1}\\par\\vspace{1pt}%
    {\\textbf{সময়ঃ #2 \\quad \\textbar \\quad পূর্ণমানঃ #3}}\\par\\vspace{1.5pt}%
    {\\vspace{5pt}}%
    {\\bfseries\\large #4}\\par\\vspace{1pt}%
    {\\normalsize\\textit{(#5)}}\\par\\vspace{2pt}%
  \\end{center}%
  \\end{minipage}\\par\\nobreak%
}

% --- CQ Section Header Command (e.g. ক বিভাগ (বীজগণিত)) ---
\\newcommand{\\cqsection}[1]{%
  \\par\\vspace{3pt plus 4pt minus 1pt}%
  \\noindent\\begin{minipage}{\\linewidth}%
    \\centering\\underline{\\textbf{\\normalsize #1}}%
  \\end{minipage}\\par%
  \\nobreak\\vspace{3pt plus 4pt minus 1pt}\\nobreak%
}

% --- Unbreakable CQ Item Container ---
\\newenvironment{cqitem}{%
  \\par\\noindent\\begin{minipage}{\\linewidth}%
  \\setlength{\\parindent}{0pt}%
  \\setlength{\\parskip}{2pt plus 1pt minus 0.5pt}%
}{%
  \\end{minipage}\\par\\vspace{4pt plus \\maxitemstretch minus 1pt}%
}

% --- CQ Header Command: \\cqheader{১}{(i) ... \\\\ (ii) ...} ---
\\newcommand{\\cqheader}[2]{%
  \\noindent\\begin{minipage}[t]{\\labelcolwidth}%
    \\textbf{#1.}%
  \\end{minipage}%
  \\begin{minipage}[t]{\\linewidth-\\labelcolwidth}%
    #2%
  \\end{minipage}\\par\\vspace{2.5pt plus 2pt minus 1pt}%
}

% --- Compact CQ Subquestion Command (Borderless 3-Column: Label | Body | Marks) ---
\\newcommand{\\subq}[3]{%
  \\noindent\\begin{minipage}[t]{\\labelcolwidth}%
    \\textbf{#1)}%
  \\end{minipage}%
  \\begin{minipage}[t]{\\dimexpr\\linewidth-\\labelcolwidth-\\markscolwidth-3pt\\relax}%
    #2%
  \\end{minipage}%
  \\hfill%
  \\begin{minipage}[t]{\\markscolwidth}%
    \\raggedleft\\textbf{#3}%
  \\end{minipage}\\par\\vspace{3pt plus 3pt minus 1pt}%
}

% --- HSC 4-tier CQ Subquestion Command: \\subqhsc{ক}{খ}{গ}{ঘ} ---
\\newcommand{\\subqhsc}[4]{%
  \\subq{ক}{#1}{১}%
  \\subq{খ}{#2}{২}%
  \\subq{গ}{#3}{৩}%
  \\subq{ঘ}{#4}{৪}%
}

% --- SQ Header & Instruction Command ---
\\newcommand{\\sqheader}[2]{%
  \\par\\vspace{3pt plus 4pt minus 1pt}%
  \\noindent\\begin{minipage}{\\linewidth}%
    \\centering\\bfseries\\large #1\\par\\vspace{1pt}{\\normalfont\\small\\textit{(#2)}}%
  \\end{minipage}\\par%
  \\nobreak\\vspace{3pt plus 4pt minus 1pt}\\nobreak%
}

\\newcommand{\\sqitem}[2]{%
  \\par\\noindent\\begin{minipage}{\\linewidth}%
    \\begin{minipage}[t]{\\labelcolwidth}%
      \\textbf{#1.}%
    \\end{minipage}%
    \\begin{minipage}[t]{\\dimexpr\\linewidth-\\labelcolwidth\\relax}%
      #2%
    \\end{minipage}%
  \\end{minipage}\\par\\vspace{4pt plus \\maxitemstretch minus 1pt}%
}

% --- Unbreakable MCQ Item Container ---
\\newenvironment{mcqitem}{%
  \\par\\noindent\\begin{minipage}{\\linewidth}%
  \\setlength{\\parindent}{0pt}%
  \\setlength{\\parskip}{1pt plus 0.5pt minus 0.5pt}%
}{%
  \\end{minipage}\\par\\vspace{3.5pt plus \\maxitemstretch minus 0pt}%
}

% --- MCQ Column Widths & Dedicated Number Column ---
\\newlength{\\mcqnumw}
\\setlength{\\mcqnumw}{16pt}
\\newlength{\\mcqlabelw}
\\setlength{\\mcqlabelw}{13pt}

% --- MCQ Question Command with Dedicated Left Number Column ---
\\newcommand{\\mcqq}[2]{%
  \\noindent\\makebox[\\mcqnumw][l]{\\textbf{#1.}}\\begin{minipage}[t]{\\linewidth-\\mcqnumw}%
    #2%
  \\end{minipage}\\par\\vspace{2pt plus 2pt minus 0.5pt}%
}

% --- MCQ Context / Stimulus Block Command (Indented strictly inside Body Column) ---
\\newcommand{\\mcqstem}[2]{%
  \\par\\vspace{2pt plus 2pt minus 0.5pt}\\noindent\\hspace*{\\mcqnumw}%
  \\begin{minipage}{\\linewidth-\\mcqnumw}%
    \\textbf{#1}\\par\\vspace{2pt}
    #2%
  \\end{minipage}\\par\\vspace{3.5pt plus 4pt minus 1pt}%
}

% --- Fixed-Grid MCQ Option Alignment (Indented inside Body Column) ---
% 4 choices in 1 single horizontal row (exact 25% grid alignment)
\\newcommand{\\fourchoices}[4]{%
  \\par\\vspace{1pt}\\noindent\\hspace*{\\mcqnumw}%
  \\begin{minipage}{\\linewidth-\\mcqnumw}%
    \\makebox[0.25\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{ক)}}\\ #1}%
    \\makebox[0.25\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{খ)}}\\ #2}%
    \\makebox[0.25\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{গ)}}\\ #3}%
    \\makebox[0.25\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{ঘ)}}\\ #4}%
  \\end{minipage}\\par\\vspace{1.5pt plus 2pt minus 0.5pt}%
}

% 2x2 grid choices (exact 50% grid alignment inside body column)
\\newcommand{\\twochoices}[4]{%
  \\par\\vspace{1pt}\\noindent\\hspace*{\\mcqnumw}%
  \\begin{minipage}{\\linewidth-\\mcqnumw}%
    \\makebox[0.5\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{ক)}}\\ #1}%
    \\makebox[0.5\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{খ)}}\\ #2}\\par\\vspace{1.5pt plus 1pt minus 0.5pt}%
    \\noindent\\makebox[0.5\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{গ)}}\\ #3}%
    \\makebox[0.5\\linewidth][l]{\\makebox[\\mcqlabelw][l]{\\textbf{ঘ)}}\\ #4}%
  \\end{minipage}\\par\\vspace{1.5pt plus 2pt minus 0.5pt}%
}

% 4 choices stacked vertically inside body column
\\newcommand{\\singlechoice}[4]{%
  \\par\\vspace{1pt}\\noindent\\hspace*{\\mcqnumw}%
  \\begin{minipage}{\\linewidth-\\mcqnumw}%
    \\makebox[\\mcqlabelw][l]{\\textbf{ক)}}\\ #1\\par\\vspace{1pt}%
    \\noindent\\makebox[\\mcqlabelw][l]{\\textbf{খ)}}\\ #2\\par\\vspace{1pt}%
    \\noindent\\makebox[\\mcqlabelw][l]{\\textbf{গ)}}\\ #3\\par\\vspace{1pt}%
    \\noindent\\makebox[\\mcqlabelw][l]{\\textbf{ঘ)}}\\ #4%
  \\end{minipage}\\par\\vspace{1.5pt plus 2pt minus 0.5pt}%
}

% --- Native Automatic MCQ Option Grid Calculator ---
\\newlength{\\optAwidth}
\\newlength{\\optBwidth}
\\newlength{\\optCwidth}
\\newlength{\\optDwidth}
\\newlength{\\maxoptwidth}

\\newcommand{\\autochoices}[4]{%
  \\settowidth{\\optAwidth}{\\textbf{ক)}\\ #1}%
  \\settowidth{\\optBwidth}{\\textbf{খ)}\\ #2}%
  \\settowidth{\\optCwidth}{\\textbf{গ)}\\ #3}%
  \\settowidth{\\optDwidth}{\\textbf{ঘ)}\\ #4}%
  \\setlength{\\maxoptwidth}{\\optAwidth}%
  \\ifdim\\optBwidth>\\maxoptwidth \\setlength{\\maxoptwidth}{\\optBwidth}\\fi
  \\ifdim\\optCwidth>\\maxoptwidth \\setlength{\\maxoptwidth}{\\optCwidth}\\fi
  \\ifdim\\optDwidth>\\maxoptwidth \\setlength{\\maxoptwidth}{\\optDwidth}\\fi
  \\ifdim\\maxoptwidth < 0.225\\dimexpr\\linewidth-\\mcqnumw\\relax
    \\fourchoices{#1}{#2}{#3}{#4}%
  \\else\\ifdim\\maxoptwidth < 0.465\\dimexpr\\linewidth-\\mcqnumw\\relax
    \\twochoices{#1}{#2}{#3}{#4}%
  \\else
    \\singlechoice{#1}{#2}{#3}{#4}%
  \\fi\\fi
}

% Roman Multi-stem List (Indented inside body column)
\\newenvironment{multistem}{%
  \\vspace{1pt}\\par\\noindent\\hspace*{\\mcqnumw}%
  \\begin{minipage}{\\linewidth-\\mcqnumw}%
  \\begin{enumerate}[label=\\roman*., itemsep=0pt, topsep=1pt, parsep=0pt, leftmargin=1.5em]
}{%
  \\end{enumerate}
  \\vspace{-2pt}
  \\noindent\\textbf{নিচের কোনটি সঠিক?}%
  \\end{minipage}\\par\\vspace{2pt}%
}
`;

export const CQ_SQ_A5_TEX = `\\documentclass[10pt,a5paper]{article}
\\usepackage[margin=0.5in]{geometry}

\\input{config}
\\input{preamble}

\\begin{document}

\\examheader{\\cqsqheadertext}{\\cqsqtimetext}{\\cqsqmarkstext}{\\cqtitletext}{\\cqinstructiontext}

\\input{sections/cq_questions}

\\vspace{6pt}
\\sqheader{\\sqtitletext}{\\sqinstructiontext}
\\input{sections/sq_questions}

\\end{document}
`;

export const MAIN_MCQ_TEX = `\\documentclass[10pt,a4paper,twocolumn]{article}
\\usepackage[margin=0.5in, columnsep=18pt]{geometry}

\\input{config}
\\input{preamble}

\\begin{document}

\\twocolumn[
  \\examheader{\\mcqheadertext}{\\mcqtimetext}{\\mcqmarkstext}{\\mcqtitletext}{\\mcqinstructiontext}
  \\vspace{4pt}
]

\\input{sections/mcq_questions}

\\end{document}
`;

export const MAIN_MCQ_SOL_TEX = `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.5in]{geometry}

\\input{config}
\\input{preamble}

\\begin{document}

\\begin{center}
  {\\bfseries\\large \\mcqsoltitletext}\\par\\vspace{4pt}
\\end{center}

\\input{sections/mcq_solutions}

\\end{document}
`;

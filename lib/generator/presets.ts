const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";
export const SUBQ_LABELS = ["ক", "খ", "গ", "ঘ"];
export const THREE_SUBQUESTION_MARKS = ["২", "৪", "৪"];
export const FOUR_SUBQUESTION_MARKS = ["১", "২", "৩", "৪"];

export interface PresetDefaults {
  subject: string;
  class: string;
  cqTime: string;
  cqMarks: string;
  cqTitle: string;
  cqInstruction: string;
  sqTitle: string;
  sqInstruction: string;
  mcqTime: string;
  mcqMarks: string;
  mcqTitle: string;
  mcqInstruction: string;
  mcqSolTitle: string;
}

export const PRESETS: Record<string, PresetDefaults> = {
  ssc_math: {
    subject: "গণিত",
    class: "নবম-দশম শ্রেণি",
    cqTime: "২ ঘণ্টা ৩০ মিনিট",
    cqMarks: "৭০",
    cqTitle: "সৃজনশীল প্রশ্ন – ৫০ নম্বর",
    cqInstruction: "প্রতি বিভাগ থেকে অন্তত ১টি করে মোট ৫টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০",
    sqTitle: "সংক্ষিপ্ত প্রশ্ন – ২০ নম্বর",
    sqInstruction: "যেকোনো ১০টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ২",
    mcqTime: "৩০ মিনিট",
    mcqMarks: "৩০",
    mcqTitle: "বহুনির্বাচনী প্রশ্ন",
    mcqInstruction: "সকল প্রশ্নের সঠিক/সর্বোৎকৃষ্ট উত্তর দাও। প্রতিটি প্রশ্নের মান সমান",
    mcqSolTitle: "\\examname\\ – \\subjectname\\ (বহুনির্বাচনী উত্তরমালা ও সংক্ষিপ্ত ব্যাখ্যা)",
  },
  ssc_hmath: {
    subject: "উচ্চতর গণিত",
    class: "নবম-দশম শ্রেণি",
    cqTime: "২ ঘণ্টা ৩৫ মিনিট",
    cqMarks: "৫০",
    cqTitle: "সৃজনশীল প্রশ্ন – ৪০ নম্বর",
    cqInstruction: "প্রতি বিভাগ থেকে অন্তত ১টি করে মোট ৪টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০",
    sqTitle: "সংক্ষিপ্ত প্রশ্ন – ১০ নম্বর",
    sqInstruction: "যেকোনো ৫টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ২",
    mcqTime: "২৫ মিনিট",
    mcqMarks: "২৫",
    mcqTitle: "বহুনির্বাচনী প্রশ্ন",
    mcqInstruction: "সকল প্রশ্নের সঠিক উত্তর দাও। প্রতিটি প্রশ্নের মান ১",
    mcqSolTitle: "\\examname\\ – \\subjectname\\ (বহুনির্বাচনী উত্তরমালা ও সংক্ষিপ্ত ব্যাখ্যা)",
  },
  ssc_physics: {
    subject: "পদার্থবিজ্ঞান",
    class: "নবম-দশম শ্রেণি",
    cqTime: "২ ঘণ্টা ৩৫ মিনিট",
    cqMarks: "৫০",
    cqTitle: "সৃজনশীল প্রশ্ন – ৪০ নম্বর",
    cqInstruction: "যেকোনো ৫টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ১০",
    sqTitle: "সংক্ষিপ্ত প্রশ্ন – ১০ নম্বর",
    sqInstruction: "যেকোনো ৫টি প্রশ্নের উত্তর দাও। প্রতিটি প্রশ্নের মান ২",
    mcqTime: "২৫ মিনিট",
    mcqMarks: "২৫",
    mcqTitle: "বহুনির্বাচনী প্রশ্ন",
    mcqInstruction: "সকল প্রশ্নের সঠিক উত্তর দাও। প্রতিটি প্রশ্নের মান ১",
    mcqSolTitle: "\\examname\\ – \\subjectname\\ (বহুনির্বাচনী উত্তরমালা ও সংক্ষিপ্ত ব্যাখ্যা)",
  },
};

export const FIELD_ALIASES: Record<string, string[]> = {
  cqInstruction: ["cqInstruction", "cqInstr", "cq_instruction"],
  sqInstruction: ["sqInstruction", "sqInstr", "sq_instruction"],
  mcqInstruction: ["mcqInstruction", "mcqInstr", "mcq_instruction"],
  cqTime: ["cqTime", "cq_time"],
  cqMarks: ["cqMarks", "cq_marks"],
  cqTitle: ["cqTitle", "cq_title"],
  sqTitle: ["sqTitle", "sq_title"],
  mcqTime: ["mcqTime", "mcq_time"],
  mcqMarks: ["mcqMarks", "mcq_marks"],
  mcqTitle: ["mcqTitle", "mcq_title"],
  institute: ["institute", "school", "college"],
  examName: ["examName", "exam_name", "title"],
  subject: ["subject", "subject_name"],
  class: ["class", "class_name", "grade"],
  year: ["year", "date", "session"],
};

export function toBanglaNum(n: number | string): string {
  const str = String(n);
  return str
    .split("")
    .map((char) => {
      const digit = parseInt(char, 10);
      return isNaN(digit) ? char : BANGLA_DIGITS[digit];
    })
    .join("");
}

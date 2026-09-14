export { type CompileOptions, type ExamData } from "./types";
export { toBanglaNum } from "./presets";
export { formatBookletOrderForLatex } from "./imposition";

import { ExamDataSchema, type ExamData, type CompileOptions } from "./types";
import {
  generateConfigTex,
  generateCqTex,
  generateSqTex,
  generateMcqTex,
  generateSolTex,
} from "./latex";

export interface GeneratedExamBundle {
  configTex: string;
  cqTex: string;
  sqTex: string;
  mcqTex: string;
  solTex: string;
  data: ExamData;
}

export function compileExamToLatexBundle(
  rawJson: unknown,
  options: CompileOptions = {},
):
  | { success: true; bundle: GeneratedExamBundle }
  | { success: false; errors: string[] } {
  const result = ExamDataSchema.safeParse(rawJson);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      ),
    };
  }

  const data = result.data;
  return {
    success: true,
    bundle: {
      configTex: generateConfigTex(data, options),
      cqTex: generateCqTex(data),
      sqTex: generateSqTex(data),
      mcqTex: generateMcqTex(data, options),
      solTex: generateSolTex(data, options),
      data,
    },
  };
}

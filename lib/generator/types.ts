import { z } from "zod";

const TableSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const SubQuestionSchema = z.union([
  z.string(),
  z.object({
    label: z.string().optional(),
    mark: z.string().optional(),
    text: z.string(),
  }),
]);

const CqQuestionSchema = z.object({
  number: z.string().optional(),
  stem: z.string().optional(),
  stems: z.array(z.string()).optional(),
  table: TableSchema.optional(),
  subs: z.array(SubQuestionSchema).optional(),
  subQuestions: z.array(SubQuestionSchema).optional(),
});

const CqSectionSchema = z.object({
  sectionName: z.string().optional(),
  name: z.string().optional(),
  questions: z.array(CqQuestionSchema).default([]),
});

const ShortQuestionSchema = z.union([
  z.string(),
  z.object({
    number: z.string().optional(),
    text: z.string(),
  }),
]);

const McqContextSchema = z.object({
  title: z.string().optional(),
  stem: z.string().optional(),
  table: TableSchema.optional(),
});

const McqQuestionSchema = z.object({
  number: z.string().optional(),
  q: z.string().optional(),
  text: z.string().optional(),
  opts: z.array(z.string()).optional(),
  choices: z.array(z.string()).optional(),
  ans: z.string().optional(),
  answer: z.string().optional(),
  exp: z.string().optional(),
  explanation: z.string().optional(),
  stems: z.array(z.string()).optional(),
  context: McqContextSchema.optional(),
});

const MetadataSchema = z.record(z.string(), z.any()).default({});

export const ExamDataSchema = z
  .object({
    preset: z.string().default("ssc_math"),
    metadata: MetadataSchema.optional(),
    cqSections: z.array(CqSectionSchema).default([]),
    shortQuestions: z.array(ShortQuestionSchema).default([]),
    mcqQuestions: z.array(McqQuestionSchema).default([]),
  })
  .passthrough();

export type CqQuestion = z.infer<typeof CqQuestionSchema>;
export type McqQuestion = z.infer<typeof McqQuestionSchema>;
export type ExamData = z.infer<typeof ExamDataSchema>;

export interface CompileOptions {
  setName?: string;
  shuffleMcq?: boolean;
  seed?: number;
  includeSolutions?: boolean;
}

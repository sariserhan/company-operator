import { z } from "zod";
const text = z.string().min(1).max(2000);
const probability = z.number().min(0).max(1);
const evidence = z.array(z.string().min(1)).min(1).max(20);
export const observationSchema = z.object({
  statement: text,
  evidence,
  importance: probability,
});
export const observationsSchema = z.object({
  observations: z.array(observationSchema).min(1).max(16),
  missingInformation: z.array(text).max(30),
});
export const hypothesisSchema = z.object({
  statement: text,
  confidence: probability,
  observationIndexes: z.array(z.number().int().nonnegative()).min(1).max(16),
});
export const bottleneckSchema = z.object({
  area: z.enum([
    "traffic",
    "activation",
    "conversion",
    "retention",
    "pricing",
    "product",
    "distribution",
    "unknown",
  ]),
  statement: text,
  evidence,
  severity: probability,
  confidence: probability,
});
export const opportunitySchema = z.object({
  title: text,
  description: text,
  estimatedImpact: z.number().nonnegative().max(100),
  confidence: probability,
  estimatedCostUsd: z.number().nonnegative().max(1_000_000),
  effort: z.enum(["small", "medium", "large"]),
  urgencyMultiplier: z.number().min(0.5).max(2),
  hypothesisIndex: z.number().int().nonnegative(),
});
export const diagnosisSchema = z.object({
  executiveSummary: text,
  currentBottleneck: bottleneckSchema,
  hypotheses: z.array(hypothesisSchema).min(1).max(12),
  opportunities: z.array(opportunitySchema).min(1).max(12),
  assumptions: z.array(text).max(20),
});
export const experimentSchema = z.object({
  title: text,
  hypothesisIndex: z.number().int().nonnegative(),
  proposedChange: text,
  successMetric: text,
  baseline: z.number().nullable(),
  baselineEvidence: z.string().nullable(),
  target: z.number().nullable(),
  direction: z.enum(["increase", "decrease"]),
  expectedImpact: text,
  estimatedCostUsd: z.number().nonnegative().max(1_000_000),
  confidence: probability,
  effort: z.enum(["small", "medium", "large"]),
  measurementPlan: text,
});
export const critiqueSchema = z.object({
  accepted: z.boolean(),
  issues: z.array(text).max(20),
  severity: z.enum(["none", "low", "medium", "high"]),
  suggestedRevision: text.nullable(),
});
export const analysisSchema = diagnosisSchema.extend({
  observations: z.array(observationSchema).min(1).max(16),
  opportunities: z
    .array(opportunitySchema.extend({ score: z.number() }))
    .min(1)
    .max(12),
  recommendedExperiment: experimentSchema,
  missingInformation: z.array(text).max(80),
});
export type CompanyAnalysis = z.infer<typeof analysisSchema>;
export type Critique = z.infer<typeof critiqueSchema>;
export type Observation = z.infer<typeof observationSchema>;

/**
 * Analyzer Türleri
 * FigmaOutput.json analiz sonuçları için tipler
 */

// ============ MODULAR ANALYZER SYSTEM ============

/**
 * Base analyzer interface
 */
export interface IAnalyzer {
  name: string;
  enabled: boolean;
  analyze(jsonData: any): AnalysisModuleResult;
}

/**
 * Her analyzer module'ün döndüreceği sonuç
 */
export interface AnalysisModuleResult {
  moduleName: string;
  enabled: boolean;
  candidatesCount: number;
  candidates: any[];
  summary?: {
    [key: string]: any;
  };
}

/**
 * Safe Area Module
 */
export interface SafeAreaCandidate {
  id: string;
  name: string;
  path: string;
  type: string;
  reason: string;
  priority: "high" | "medium" | "low";
  recommendation: string;
  issues: string[];
}

// ============ LEGACY TYPES (Backward Compatibility) ============

export interface AnalysisResult {
  componentCandidates: ComponentCandidate[];
  renameCandidates: RenameCandidate[];
  layoutCandidates: LayoutCandidate[];
  summary: AnalysisSummary;
  // Yeni modular sonuçlar
  modules?: {
    [moduleName: string]: AnalysisModuleResult;
  };
}

export interface ComponentCandidate {
  id: string;
  name: string;
  type: string;
  path: string;
  reason: string; // Neden component olması tavsiye ediliyor
  confidence: "high" | "medium" | "low";
  childrenCount: number;
  isRepeated: boolean;
  similarNodes: string[]; // Benzer node ID'leri
  recommendation: string;
}

export interface RenameCandidate {
  id: string;
  currentName: string;
  paths: string[];
  issues: RenameIssue[];
  suggestedName: string;
  priority: "high" | "medium" | "low";
}

export type RenameIssue =
  | "contains_spaces"
  | "contains_special_chars"
  | "not_kebab_case"
  | "not_camelCase"
  | "inconsistent_naming"
  | "too_long"
  | "unclear_name";

export interface LayoutCandidate {
  id: string;
  name: string;
  path: string;
  type: string;
  reason: string;
  childrenCount: number;
  arrangement: "vertical" | "horizontal" | "grid" | "mixed";
  spacingPattern: SpacingPattern;
  confidence: "high" | "medium" | "low";
  suggestedConfig: AutoLayoutConfig;
}

export interface SpacingPattern {
  hasConsistentSpacing: boolean;
  estimatedSpacing: number;
  spacingVariance: number;
  alignmentType: "left" | "center" | "right" | "mixed" | "justified";
}

export interface AutoLayoutConfig {
  mode: "HORIZONTAL" | "VERTICAL";
  spacing: number;
  padding?: {
    horizontal: number;
    vertical: number;
  };
  alignment: string;
}

export interface AnalysisSummary {
  totalNodes: number;
  frameCount: number;
  groupCount: number;
  componentCount: number;
  textCount: number;
  estimatedAutomationSavings: string;
  // Modular system summary
  modulesSummary?: {
    [moduleName: string]: {
      enabled: boolean;
      candidatesCount: number;
    };
  };
  // Legacy properties (for backward compatibility)
  componentCandidatesCount?: number;
  renameCandidatesCount?: number;
  layoutCandidatesCount?: number;
}

export interface NodeData {
  id: string;
  name: string;
  type: string;
  parent?: NodeData;
  children?: NodeData[];
  properties?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    locked?: boolean;
    clipsContent?: boolean;
    layoutMode?: string;
    itemSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
}

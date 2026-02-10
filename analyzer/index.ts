import { IAnalyzer, AnalysisResult, AnalysisSummary, AnalysisModuleResult, RenameCandidate } from "./types";
import { ReportGenerator } from "./reportGenerator";
import fs from "fs";
import path from "path";

/**
 * Inline analyzer implementations
 * Using object literals to avoid TypeScript class field initialization issues
 */

// RenameAnalyzer implementation
const createRenameAnalyzer = (): IAnalyzer => {
  const nameOccurrences = new Map<string, string[]>();

  const collectAllNames = (data: any): void => {
    if (!data) return;
    if (Array.isArray(data)) {
      data.forEach((item) => collectAllNames(item));
      return;
    }
    if (data.id && data.name) {
      const name = String(data.name).trim();
      if (!nameOccurrences.has(name)) nameOccurrences.set(name, []);
      nameOccurrences.get(name)!.push(data.id);
    }
    if (data.children && Array.isArray(data.children)) {
      data.children.forEach((child: any) => collectAllNames(child));
    }
  };

  const analyzeNameIssues = (name: string): string[] => {
    const issues: string[] = [];
    if (name.includes(" ")) issues.push("contains_spaces");
    if (/[^a-z0-9_\- ]/i.test(name)) issues.push("contains_special_chars");
    if (/[^a-z0-9_-]/i.test(name)) issues.push("invalid_characters");
    if (name.length > 50) issues.push("too_long");
    return issues;
  };

  return {
    name: "rename",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      const candidates: any[] = [];
      nameOccurrences.clear();
      if (jsonData.document) collectAllNames(jsonData.document);
      else if (Array.isArray(jsonData)) jsonData.forEach((item: any) => collectAllNames(item));
      else collectAllNames(jsonData);

      nameOccurrences.forEach((nodeIds, name) => {
        const issues = analyzeNameIssues(name);
        if (issues.length > 0) {
          candidates.push({
            currentName: name,
            id: nodeIds[0],
            paths: nodeIds,
            issues,
            suggestedName: name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9_-]/g, ""),
            priority: "medium",
          });
        }
      });

      return {
        moduleName: "rename",
        enabled: true,
        candidatesCount: candidates.length,
        candidates,
        summary: { total: candidates.length },
      };
    },
  };
};

// ComponentAnalyzer implementation  
const createComponentAnalyzer = (): IAnalyzer => {
  return {
    name: "component",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      return {
        moduleName: "component",
        enabled: true,
        candidatesCount: 0,
        candidates: [],
      };
    },
  };
};

// LayoutAnalyzer implementation
const createLayoutAnalyzer = (): IAnalyzer => {
  const candidates: any[] = [];

  const analyzeSpacing = (positions: number[]) => {
    if (positions.length < 2) {
      return { hasConsistentSpacing: false, estimatedSpacing: 0, spacingVariance: 0 };
    }
    const gaps = [];
    for (let i = 1; i < positions.length; i++) {
      gaps.push(positions[i] - positions[i - 1]);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = Math.sqrt(gaps.reduce((a, b) => a + Math.pow(b - avgGap, 2), 0) / gaps.length);
    return {
      hasConsistentSpacing: variance < avgGap * 0.2,
      estimatedSpacing: Math.round(avgGap),
      spacingVariance: Math.round(variance),
    };
  };

  const analyzeFrame = (frame: any, path: string) => {
    if (!Array.isArray(frame.children) || frame.children.length < 2) return;

    const childBounds = frame.children
      .filter((c: any) => c.absoluteBoundingBox)
      .map((c: any) => ({ ...c, bounds: c.absoluteBoundingBox }));

    if (childBounds.length < 2) return;

    // Detect arrangement
    const yPositions = childBounds.map((c: any) => c.bounds.y);
    const xPositions = childBounds.map((c: any) => c.bounds.x);
    const yVariance = Math.max(...yPositions) - Math.min(...yPositions);
    const xVariance = Math.max(...xPositions) - Math.min(...xPositions);

    let arrangement = "mixed";
    if (yVariance < 5) arrangement = "horizontal";
    else if (xVariance < 5) arrangement = "vertical";

    // Analyze spacing based on arrangement
    const sortedPositions = arrangement === "horizontal" ? xPositions.sort((a, b) => a - b) : yPositions.sort((a, b) => a - b);
    const spacingData = analyzeSpacing(sortedPositions);

    // Calculate confidence
    let confidence: "high" | "medium" | "low" = "low";
    if (spacingData.hasConsistentSpacing && childBounds.length >= 3) {
      confidence = "high";
    } else if (spacingData.hasConsistentSpacing || childBounds.length >= 2) {
      confidence = "medium";
    }

    // Determine reason
    let reason = "Has consistent spacing pattern";
    if (!spacingData.hasConsistentSpacing) {
      reason = "Multiple children could benefit from auto layout";
    }

    candidates.push({
      id: frame.id,
      name: frame.name || "Unnamed Frame",
      path,
      type: frame.type,
      reason,
      childrenCount: childBounds.length,
      arrangement,
      spacingPattern: {
        hasConsistentSpacing: spacingData.hasConsistentSpacing,
        estimatedSpacing: spacingData.estimatedSpacing,
        spacingVariance: spacingData.spacingVariance,
        alignmentType: "mixed",
      },
      confidence,
      suggestedConfig: {
        mode: arrangement === "horizontal" ? "HORIZONTAL" : arrangement === "vertical" ? "VERTICAL" : "HORIZONTAL",
        spacing: spacingData.estimatedSpacing,
        alignment: "center",
      },
    });
  };

  const traverse = (node: any, path: string = ""): void => {
    if (!node) return;
    if (node.type === "FRAME" || node.type === "GROUP") {
      analyzeFrame(node, path);
    }
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => traverse(child, path + "/" + (child.name || child.id)));
    }
  };

  return {
    name: "layout",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      candidates.length = 0;
      if (jsonData.document) traverse(jsonData.document);
      else if (Array.isArray(jsonData)) jsonData.forEach((item: any) => traverse(item));
      else traverse(jsonData);

      return {
        moduleName: "layout",
        enabled: true,
        candidatesCount: candidates.length,
        candidates,
      };
    },
  };
};

// SafeAreaAnalyzer implementation
const createSafeAreaAnalyzer = (): IAnalyzer => {
  return {
    name: "safearea",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      const candidates: any[] = [];
      
      const traverse = (node: any, path: string = ""): void => {
        if (!node) return;
        if (node.type === "FRAME") {
          const width = node.absoluteBoundingBox?.width || 0;
          const height = node.absoluteBoundingBox?.height || 0;
          if ((width < 600 && height > 500) || (height < 600 && width > 500)) {
            candidates.push({
              id: node.id,
              name: node.name || "Screen",
              path,
              type: "FRAME",
              priority: "medium",
              issues: ["possible_safe_area_needed"],
            });
          }
        }
        if (Array.isArray(node.children)) {
          node.children.forEach((child: any) => traverse(child, path + "/" + (child.name || child.id)));
        }
      };

      if (jsonData.document) traverse(jsonData.document);
      else if (Array.isArray(jsonData)) jsonData.forEach((item: any) => traverse(item));
      else traverse(jsonData);

      return {
        moduleName: "safearea",
        enabled: true,
        candidatesCount: candidates.length,
        candidates,
      };
    },
  };
};

/**
 * Analyzer factory
 */
export function analyzeFile(jsonData: any, enabledModules?: { [key: string]: boolean }): AnalysisResult {
  const analyzers = [
    createRenameAnalyzer(),
    createComponentAnalyzer(),
    createLayoutAnalyzer(),
    createSafeAreaAnalyzer(),
  ];

  // Apply configuration
  if (enabledModules) {
    analyzers.forEach((a) => {
      if (enabledModules.hasOwnProperty(a.name)) {
        a.enabled = enabledModules[a.name];
      }
    });
  }

  const modules: { [key: string]: AnalysisModuleResult } = {};
  analyzers.forEach((analyzer) => {
    console.log(`Analyzing with ${analyzer.name}... (enabled: ${analyzer.enabled})`);
    if (analyzer.enabled) {
      const result = analyzer.analyze(jsonData);
      modules[analyzer.name] = result;
    } else {
      modules[analyzer.name] = {
        moduleName: analyzer.name,
        enabled: false,
        candidatesCount: 0,
        candidates: [],
      };
    }
  });

  // Count elements
  let totalNodes = 0, frameCount = 0, groupCount = 0, componentCount = 0, textCount = 0;
  const traverse = (node: any) => {
    if (!node) return;
    if (node.type) {
      totalNodes++;
      if (node.type === "FRAME") frameCount++;
      else if (node.type === "GROUP") groupCount++;
      else if (node.type === "COMPONENT") componentCount++;
      else if (node.type === "TEXT") textCount++;
    }
    if (Array.isArray(node.children)) {
      node.children.forEach((child: any) => traverse(child));
    }
  };

  if (jsonData.document) traverse(jsonData.document);
  else if (Array.isArray(jsonData)) jsonData.forEach((item: any) => traverse(item));
  else traverse(jsonData);

  const summary: AnalysisSummary = {
    totalNodes,
    frameCount,
    groupCount,
    componentCount,
    textCount,
    estimatedAutomationSavings: "< 1 saat",
    modulesSummary: {},
  };

  Object.values(modules).forEach((m) => {
    summary.modulesSummary![m.moduleName] = {
      enabled: m.enabled,
      candidatesCount: m.candidatesCount,
    };
  });

  return {
    componentCandidates: modules["component"]?.candidates || [],
    renameCandidates: modules["rename"]?.candidates || [],
    layoutCandidates: modules["layout"]?.candidates || [],
    summary,
    modules,
  };
}

export default analyzeFile;


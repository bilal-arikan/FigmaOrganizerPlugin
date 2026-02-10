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
    if (/[!@#$%^&*()\-+\[\]{};:'"<>,.?/\\|`~]/.test(name)) issues.push("contains_special_chars");
    if (name.length > 50) issues.push("too_long");
    return issues;
  };

  return {
    name: "rename",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      const candidates: any[] = [];
      nameOccurrences.clear();
      collectAllNames(jsonData);

      nameOccurrences.forEach((nodeIds, name) => {
        const issues = analyzeNameIssues(name);
        if (issues.length > 0) {
          candidates.push({
            currentName: name,
            id: nodeIds[0],
            paths: nodeIds,
            issues,
            suggestedName: name.toLowerCase().replace(/\s+/g, "-"),
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
  return {
    name: "layout",
    enabled: true,
    analyze: (jsonData: any): AnalysisModuleResult => {
      return {
        moduleName: "layout",
        enabled: true,
        candidatesCount: 0,
        candidates: [],
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


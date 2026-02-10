import { RenameAnalyzer } from "./renameAnalyzer";
import { ReportGenerator } from "./reportGenerator";
import { AnalysisResult, AnalysisSummary } from "./types";
import fs from "fs";
import path from "path";

/**
 * Figma JSON Analyzer - Ana Orkestrast
 * FigmaOutput.json analiz eder ve komprehensif rapor üretir
 */
export class FigmaAnalyzer {
  /**
   * JSON dosyasını analiz et ve rapor oluştur
   */
  static analyzeFile(
    inputPath: string,
    outputDir: string = "./reports"
  ): void {
    console.log("🚀 Figma Analyzer başlanıyor...\n");

    // 1. JSON dosyasını oku
    console.log(`📂 Dosya okunuyor: ${inputPath}`);
    const jsonData = this.readJsonFile(inputPath);

    if (!jsonData) {
      console.error("❌ JSON dosyası okunamadı!");
      return;
    }

    console.log("✓ JSON başarıyla yüklendi\n");

    // 2. Analiz et
    console.log("🔍 Analiz yapılıyor...\n");
    const result = this.analyze(jsonData);

    // 3. Rapor oluştur
    console.log("📊 Rapor üretiliyor...\n");
    this.createReports(result, outputDir);

    // 4. Konsol özeti
    this.logSummary(result);
  }

  /**
   * JSON analizini gerçekleştir
   */
  private static analyze(jsonData: any): AnalysisResult {
    // Analyzer'ı çalıştır (sadece rename)
    const renameAnalyzer = new RenameAnalyzer();

    console.log("  ⏳ İsim standardizasyonu kontrol ediliyor...");
    const renameCandidates = renameAnalyzer.analyze(jsonData);
    console.log(`     ✓ ${renameCandidates.length} önerisi bulundu\n`);

    // Diğer analyzer'lar deaktif
    const componentCandidates: any[] = [];
    const layoutCandidates: any[] = [];

    // Özet oluştur
    const summary = this.generateSummary(jsonData, {
      components: componentCandidates,
      renames: renameCandidates,
      layouts: layoutCandidates,
    });

    return {
      componentCandidates,
      renameCandidates,
      layoutCandidates,
      summary,
    };
  }

  /**
   * Özet istatistikleri oluştur
   */
  private static generateSummary(
    jsonData: any,
    counts: {
      components: any[];
      renames: any[];
      layouts: any[];
    }
  ): AnalysisSummary {
    const stats = this.countElements(jsonData);

    // Tahmini otomasyonda kazanılan zaman
    const estimatedHours =
      (counts.components.length * 0.5 +
        counts.renames.length * 0.25 +
        counts.layouts.length * 0.75) /
      60;

    return {
      totalNodes: stats.totalNodes,
      frameCount: stats.frameCount,
      groupCount: stats.groupCount,
      componentCount: stats.componentCount,
      textCount: stats.textCount,
      componentCandidatesCount: counts.components.length,
      renameCandidatesCount: counts.renames.length,
      layoutCandidatesCount: counts.layouts.length,
      estimatedAutomationSavings:
        estimatedHours < 1
          ? "< 1 saat"
          : estimatedHours.toFixed(1) + " saat",
    };
  }

  /**
   * JSON'da tüm element tiplerini sayılandır
   */
  private static countElements(
    data: any
  ): {
    totalNodes: number;
    frameCount: number;
    groupCount: number;
    componentCount: number;
    textCount: number;
  } {
    let totalNodes = 0;
    let frameCount = 0;
    let groupCount = 0;
    let componentCount = 0;
    let textCount = 0;

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type) {
        totalNodes++;
        switch (node.type) {
          case "FRAME":
            frameCount++;
            break;
          case "GROUP":
            groupCount++;
            break;
          case "COMPONENT":
            componentCount++;
            break;
          case "TEXT":
            textCount++;
            break;
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach((child: any) => traverse(child));
      }
      if (Array.isArray(node.document?.children)) {
        node.document.children.forEach((child: any) => traverse(child));
      }
    };

    traverse(data);
    return {
      totalNodes,
      frameCount,
      groupCount,
      componentCount,
      textCount,
    };
  }

  /**
   * Raporları dosyaya kaydet
   */
  private static createReports(result: AnalysisResult, outputDir: string): void {
    // Output klasörü oluştur
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split("T")[0];

    // 1. TEXT rapor
    const textReport = ReportGenerator.generateTextReport(result);
    const textPath = path.join(outputDir, `figma-analysis-${timestamp}.txt`);
    fs.writeFileSync(textPath, textReport);
    console.log(`✓ Text rapor: ${textPath}`);

    // 2. JSON rapor
    const jsonReport = ReportGenerator.generateJSONReport(result);
    const jsonPath = path.join(outputDir, `figma-analysis-${timestamp}.json`);
    fs.writeFileSync(jsonPath, jsonReport);
    console.log(`✓ JSON rapor: ${jsonPath}`);

    // 3. HTML rapor
    const htmlReport = ReportGenerator.generateHTMLReport(result);
    const htmlPath = path.join(outputDir, `figma-analysis-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);
    console.log(`✓ HTML rapor: ${htmlPath}`);

    // 4. CLI-accessible JSON (aksiyonlar için)
    const actionsJson = this.generateActionsJson(result);
    const actionsPath = path.join(outputDir, `figma-actions-${timestamp}.json`);
    fs.writeFileSync(actionsPath, JSON.stringify(actionsJson, null, 2));
    console.log(`✓ Aksiyon JSON: ${actionsPath}\n`);
  }

  /**
   * Figma Plugin için uygulanabilir aksiyonlar oluştur
   * Bu JSON dosyası doğrudan example-rules.json'a dönüştürülebilir
   */
  private static generateActionsJson(result: AnalysisResult) {
    return {
      description: "Otomatik analiz tarafından oluşturulmuş öneriler",
      note: "Lütfen her aksiyonu kontrol et ve uygulamadan önce onay ver",
      generatedAt: new Date().toISOString(),
      makeComponent: result.componentCandidates
        .filter((c) => c.confidence === "high")
        .map((c) => ({
          id: c.id,
          type: c.type,
          reason: c.reason,
          confidence: c.confidence,
        })),
      rename: result.renameCandidates
        .filter((c) => c.priority === "high")
        .map((c) => ({
          id: c.id,
          name: c.suggestedName,
          current: c.currentName,
          reason: c.issues.join(", "),
          occurrences: c.paths.length,
        })),
      layout: result.layoutCandidates
        .filter((c) => c.confidence === "high")
        .map((c) => ({
          id: c.id,
          mode: c.suggestedConfig.mode,
          spacing: c.suggestedConfig.spacing,
          padding: c.suggestedConfig.padding,
          reason: c.reason,
          confidence: c.confidence,
        })),
    };
  }

  /**
   * Konsol özetini göster
   */
  private static logSummary(result: AnalysisResult): void {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("                     📊 ANALIZ ÖZETI");
    console.log("═══════════════════════════════════════════════════════════");
    console.log();
    console.log(
      `  🎨 Component Adayı:        ${result.summary.componentCandidatesCount}`
    );
    console.log(
      `  ✏️  İsim Değişikliği:       ${result.summary.renameCandidatesCount}`
    );
    console.log(
      `  📐 Auto Layout Potansiyeli: ${result.summary.layoutCandidatesCount}`
    );
    console.log();
    console.log(`  ⏱️  Tahmini İş Yükü Azaltma: ${result.summary.estimatedAutomationSavings}`);
    console.log();
    console.log("═══════════════════════════════════════════════════════════");
    console.log();
  }

  /**
   * JSON dosyasını oku
   */
  private static readJsonFile(filePath: string): any {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`❌ Hata: ${error}`);
      return null;
    }
  }
}

// CLI argumentleri işle
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  🎨 FIGMA ANALYZER                            ║
║         Figma Design Sistemini Otomatik Analiz Et             ║
╚════════════════════════════════════════════════════════════════╝

KULLANIM:
  node analyzer.js <input.json> [output-dir]

ÖRNEKLER:
  node analyzer.js FigmaOutput.json
  node analyzer.js FigmaOutput.json ./my-reports

ÇIKTI:
  ✓ figma-analysis-YYYY-MM-DD.txt   (İnsan okunabilir rapor)
  ✓ figma-analysis-YYYY-MM-DD.json  (Detaylı veri)
  ✓ figma-analysis-YYYY-MM-DD.html  (Web görüntüleme)
  ✓ figma-actions-YYYY-MM-DD.json   (Plugin'de kullanılabilir)
    `);
    process.exit(0);
  }

  const inputFile = args[0];
  const outputDir = args[1] || "./reports";

  FigmaAnalyzer.analyzeFile(inputFile, outputDir);
}

export default FigmaAnalyzer;

/**
 * Directly analyze JSON data and return results
 * Used by server and UI
 */
export function analyzeFile(jsonData: any): AnalysisResult {
  // Sadece rename analyzer çalışıyor
  const renameAnalyzer = new RenameAnalyzer();
  const renameCandidates = renameAnalyzer.analyze(jsonData);

  // Diğer analyzer'lar deaktif
  const componentCandidates: any[] = [];
  const layoutCandidates: any[] = [];

  // Count nodes
  const nodeStats = FigmaAnalyzer["countElements"](jsonData) || {
    totalNodes: 0,
    frameCount: 0,
    groupCount: 0,
    componentCount: 0,
    textCount: 0,
  };

  // Estimate time savings (in hours)
  const estimatedHours = (renameCandidates.length * 0.25) / 60;

  const summary: AnalysisSummary = {
    totalNodes: nodeStats.totalNodes,
    frameCount: nodeStats.frameCount,
    groupCount: nodeStats.groupCount,
    componentCount: nodeStats.componentCount,
    textCount: nodeStats.textCount,
    componentCandidatesCount: componentCandidates.length,
    renameCandidatesCount: renameCandidates.length,
    layoutCandidatesCount: layoutCandidates.length,
    estimatedAutomationSavings: `${estimatedHours.toFixed(1)} saat`,
  };

  return {
    componentCandidates,
    renameCandidates,
    layoutCandidates,
    summary,
  };
}

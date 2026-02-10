import { RenameCandidate, RenameIssue } from "./types";

/**
 * İsim standardizasyonu ve cleaning için analyzer
 * Naming convention'ları kontrol eder ve tavsiye sunar
 */
export class RenameAnalyzer {
  private nameOccurrences: Map<string, string[]> = new Map(); // name -> [id1, id2, ...]

  analyze(jsonData: any): RenameCandidate[] {
    const candidates: RenameCandidate[] = [];

    // Tüm node'ları tarayıp isimleri kontrol et
    this.collectAllNames(jsonData);

    this.nameOccurrences.forEach((nodeIds, name) => {
      const issues = this.analyzeNameIssues(name);

      if (issues.length > 0) {
        candidates.push({
          currentName: name,
          id: nodeIds[0], // Primary ID
          paths: nodeIds,
          issues,
          suggestedName: this.suggestFixedName(name, issues),
          priority: this.calculateNamePriority(issues),
        });
      }
    });

    return candidates.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private collectAllNames(data: any): void {
    if (!data) return;

    if (Array.isArray(data)) {
      data.forEach((item) => this.collectAllNames(item));
      return;
    }

    if (data.id && data.name) {
      if (!this.nameOccurrences.has(data.name)) {
        this.nameOccurrences.set(data.name, []);
      }
      this.nameOccurrences.get(data.name)!.push(data.id);
    }

    if (data.children && Array.isArray(data.children)) {
      data.children.forEach((child: any) => this.collectAllNames(child));
    }
  }

  /**
   * İsim için sorunları analiz eder
   */
  private analyzeNameIssues(name: string): RenameIssue[] {
    const issues: RenameIssue[] = [];

    // 1. Boşluk kontrolü
    if (/\s/.test(name)) {
      issues.push("contains_spaces");
    }

    // 2. Özel karakterler (hala izin verilenler hariç)
    if (/[^\w\-\/]/u.test(name)) {
      issues.push("contains_special_chars");
    }

    // 3. kebab-case kontrolü
    // Eğer boş yok ve "/" ya da "-" varsa veya camelCase'se
    const hasDashes = name.includes("-");
    const hasSlashes = name.includes("/");

    // "/" varsa hierarchical naming (iyi) - sadece kontrol et
    if (!hasSlashes) {
      // "/" yok, o zaman kebab-case olmalı
      const isKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
      const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(name);
      const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(name);

      if (!isKebabCase && !isCamelCase && !isPascalCase) {
        if ("contains_spaces" in issues || "contains_special_chars" in issues) {
          issues.push("not_kebab_case");
        }
      }
    }

    // 4. Çok uzun isimler
    if (name.length > 50) {
      issues.push("too_long");
    }

    // 5. Belirsiz isimler
    if (this.isUnclearName(name)) {
      issues.push("unclear_name");
    }

    return [...new Set(issues)]; // Duplike'leri kaldır
  }

  /**
   * İsmin belirsiz olup olmadığını kontrol eder
   */
  private isUnclearName(name: string): boolean {
    const unclearPatterns = [
      /^(Group|Frame|Shape|Element|Node|Item|Container)\s*\d*$/i,
      /^(Copy|Copy of|Duplicate|v1|v2|temp|temp1|test|test1)$/i,
      /^(Layer|Layer \d+|Rectangle|Ellipse)$/,
      /^[A-Z]+(_[A-Z]+)*$/, // Sadece uppercase
    ];

    return unclearPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Sorunlara göre isim tahmin eder
   */
  private suggestFixedName(name: string, issues: RenameIssue[]): string {
    let fixed = name;

    // "/" varsa (component naming) - sadece minimal temizlik yap
    if (fixed.includes("/")) {
      fixed = fixed
        .split("/")
        .map((part) => this.cleanPart(part))
        .join("/");
      return fixed;
    }

    // Boşluk ve özel karakterleri '-' ile değiştir
    fixed = fixed
      .replace(/\s+/g, "-") // Boşlukları '-' yap
      .replace(/[^\w\-]/g, "-") // Özel karakterleri '-' yap
      .replace(/-+/g, "-") // Çoklu '-'i tekine indir
      .toLowerCase();

    // Baştan ve sondan '-' kaldır
    fixed = fixed.replace(/^-+|-+$/g, "");

    return fixed;
  }

  /**
   * Küçük bir part temizle
   */
  private cleanPart(part: string): string {
    return part
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "")
      .toLowerCase()
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Sorun sayı ve türüne göre öncelik belirle
   */
  private calculateNamePriority(
    issues: RenameIssue[]
  ): "high" | "medium" | "low" {
    // Belirsiz isimler = high priority
    if (issues.includes("unclear_name") || issues.includes("contains_spaces")) {
      return "high";
    }

    // Özel karakterler ve konsistensi = medium
    if (issues.includes("contains_special_chars")) {
      return "medium";
    }

    // Uzunluk vb = low
    return "low";
  }
}

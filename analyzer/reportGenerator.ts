import {
  AnalysisResult,
  RenameCandidate,
} from "./types";

/**
 * Analiz sonuçlarından insan-okunabilir raporlar üretir
 * Sadece rename analizi için
 */
export class ReportGenerator {
  /**
   * Detaylı text rapor oluştur
   */
  static generateTextReport(result: AnalysisResult): string {
    let report = "";

    report += "═══════════════════════════════════════════════════════════════\n";
    report += "         FIGMA DESIGN ORGANIZER - ANALİZ RAPORU\n";
    report += "═══════════════════════════════════════════════════════════════\n\n";

    // Özet
    report += this.generateSummarySection(result.summary);

    // Rename Adayları
    report += this.generateRenameSection(result.renameCandidates);

    report += "\n═══════════════════════════════════════════════════════════════\n";

    return report;
  }

  /**
   * JSON format rapor
   */
  static generateJSONReport(result: AnalysisResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * HTML rapor
   */
  static generateHTMLReport(result: AnalysisResult): string {
    const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Figma Organizer - Analiz Raporu</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #2563eb;
            margin-bottom: 10px;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .stat-card.rename {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        h2 {
            color: #2563eb;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #e5e7eb;
        }
        
        .empty-state {
            background: #f3f4f6;
            padding: 30px;
            border-radius: 8px;
            text-align: center;
            color: #666;
        }
        
        .empty-state h3 {
            color: #10b981;
            margin-bottom: 10px;
        }
        
        .card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }
        
        .card:hover {
            border-color: #d1d5db;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .card-title {
            font-size: 16px;
            font-weight: 600;
            color: #111;
            margin-bottom: 10px;
        }
        
        .card-meta {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }
        
        .badge {
            display: inline-block;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #e5e7eb;
            color: #374151;
            font-weight: 500;
        }
        
        .badge.high {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge.medium {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge.low {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .issues-list {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        
        .issue-tag {
            font-size: 12px;
            background: #fecaca;
            color: #7f1d1d;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Figma Organizer - Analiz Raporu</h1>
        <p class="subtitle">Tasarım sisteminizin iyileştirilmesi için öneriler</p>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${result.summary.totalNodes}</div>
                <div class="stat-label">Toplam Node</div>
            </div>
            <div class="stat-card rename">
                <div class="stat-value">${result.summary.renameCandidatesCount}</div>
                <div class="stat-label">İsim Değişikliği</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${result.summary.estimatedAutomationSavings}</div>
                <div class="stat-label">Tahmini İş Yükü Azaltma</div>
            </div>
        </div>
        
        ${this.generateHTMLRenameSection(result.renameCandidates)}
        
        <footer>
            <p>Bu rapor Figma Organizer tarafından otomatik olarak oluşturulmuştur.</p>
            <p>${new Date().toLocaleString('tr-TR')}</p>
        </footer>
    </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Özet bölümü oluştur
   */
  private static generateSummarySection(summary: any): string {
    let text = "📊 ÖZET BİLGİLER\n";
    text += "───────────────────────────────────────────────────────────────\n";
    text += `Toplam Nodes:                ${summary.totalNodes}\n`;
    text += `Frame Count:                 ${summary.frameCount}\n`;
    text += `Group Count:                 ${summary.groupCount}\n`;
    text += `Component Count:             ${summary.componentCount}\n`;
    text += `Text Count:                  ${summary.textCount}\n`;
    text += `İsim Değişiklik Önerileri:   ${summary.renameCandidatesCount}\n`;
    text += `Tahmini İş Yükü Azaltma:     ${summary.estimatedAutomationSavings}\n\n`;
    return text;
  }

  /**
   * İsim değişiklik bölümü oluştur
   */
  private static generateRenameSection(candidates: RenameCandidate[]): string {
    if (candidates.length === 0) {
      return "✅ İsim Standardizasyonu Gerekli Yok\n\n";
    }

    let text = "";
    text += "✏️  İSİM DEĞİŞİKLİK ÖNERİLERİ\n";
    text += "───────────────────────────────────────────────────────────────\n\n";

    const byPriority = {
      high: candidates.filter((c) => c.priority === "high"),
      medium: candidates.filter((c) => c.priority === "medium"),
      low: candidates.filter((c) => c.priority === "low"),
    };

    if (byPriority.high.length > 0) {
      text += "⭐ HEMEN YAPILMALI (High Priority)\n";
      byPriority.high.forEach((c) => {
        text += `\n  "${c.currentName}" → "${c.suggestedName}"\n`;
        text += `     Sorunlar: ${c.issues.join(", ")}\n`;
        text += `     Yer Sayısı: ${c.paths.length}\n`;
      });
    }

    if (byPriority.medium.length > 0) {
      text += "\n\n⭐ ÖNERİLİ (Medium Priority)\n";
      byPriority.medium.slice(0, 5).forEach((c) => {
        text += `\n  "${c.currentName}" → "${c.suggestedName}"\n`;
        text += `     Sorunlar: ${c.issues.join(", ")}\n`;
      });
    }

    text += "\n";
    return text;
  }

  /**
   * HTML rename section
   */
  private static generateHTMLRenameSection(candidates: RenameCandidate[]): string {
    if (candidates.length === 0) {
      return `
        <div class="section">
            <h2>✏️ İsim Önerileri</h2>
            <div class="empty-state">
                <h3>✅ İsimler Zaten İyi</h3>
                <p>Naming convention'ları takip ediliyor.</p>
            </div>
        </div>
      `;
    }

    let html = `
        <div class="section">
            <h2>✏️ İsim Değişiklik Önerileri (${candidates.length})</h2>
    `;

    candidates.forEach((c) => {
      html += `
            <div class="card">
                <div class="card-title">"${c.currentName}" → "${c.suggestedName}"</div>
                <div class="card-meta">
                    <span class="badge ${c.priority}">${c.priority.toUpperCase()}</span>
                    <span>${c.paths.length} yer</span>
                </div>
                <div class="issues-list">
                    ${c.issues.map((issue) => `<span class="issue-tag">${issue}</span>`).join("")}
                </div>
            </div>
      `;
    });

    html += `</div>`;
    return html;
  }
}

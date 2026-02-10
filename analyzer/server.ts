import * as http from "http";

const index = require("./index");
const { analyzeFile } = index;

console.log("🔍 DEBUG: index exports:", Object.keys(index));
console.log("🔍 DEBUG: analyzeFile type:", typeof analyzeFile);

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/analyze") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const jsonData = JSON.parse(body);

        // Analyze the JSON
        const results = analyzeFile(jsonData);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            results,
          })
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: false,
            error: errorMsg,
          })
        );
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Figma Analyzer Server running on http://localhost:${PORT}`);
  console.log(`📨 POST http://localhost:${PORT}/analyze`);
});

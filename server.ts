import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { trainAndEvaluate, makePrediction } from "./src/lib/ml.js";
import { IrisData, ModelType, TrainedModel } from "./src/types.js";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory store
  let activeModel: TrainedModel | null = null;
  let activeTrainSet: IrisData[] = [];
  const predictionLogs: any[] = [];
  const startupTime = new Date();

  // API Routes
  app.get("/api/status", (req, res) => {
    res.json({ 
      status: "online", 
      uptime: process.uptime(),
      modelActive: !!activeModel,
      modelType: activeModel?.type,
      logsCount: predictionLogs.length,
      startedAt: startupTime
    });
  });

  app.post("/api/train", (req, res) => {
    const startObj = process.hrtime();
    const { data, trainRatio, modelType, kValue } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid data" });
    }

    try {
      const result = trainAndEvaluate(data, trainRatio, modelType, kValue || 3);
      activeModel = result.modelState;
      activeTrainSet = result.trainSet;
      
      const diff = process.hrtime(startObj);
      const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
      
      res.json({ ...result, latencyMs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/predict", (req, res) => {
    const startObj = process.hrtime();
    const { point } = req.body;

    if (!activeModel || activeTrainSet.length === 0) {
      return res.status(400).json({ error: "Model not trained yet." });
    }

    try {
      const result = makePrediction(point, activeTrainSet, activeModel);
      
      const diff = process.hrtime(startObj);
      const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

      predictionLogs.unshift({
        timestamp: new Date(),
        inputs: point,
        prediction: result.prediction,
        modelInfo: activeModel.type,
        latencyMs
      });

      // Keep only 100 logs
      if (predictionLogs.length > 100) predictionLogs.pop();

      res.json({ ...result, latencyMs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/batch-predict", (req, res) => {
    const startObj = process.hrtime();
    const { points } = req.body;

    if (!activeModel || activeTrainSet.length === 0) {
      return res.status(400).json({ error: "Model not trained yet." });
    }

    try {
      const results = points.map((pt: any) => makePrediction(pt, activeTrainSet, activeModel!));
      
      const diff = process.hrtime(startObj);
      const latencyMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

      res.json({ results, latencyMs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/logs", (req, res) => {
    res.json(predictionLogs);
  });

  app.post("/api/clear-logs", (req, res) => {
    predictionLogs.length = 0;
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

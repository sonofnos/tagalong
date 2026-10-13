import { Request, Response, NextFunction } from "express";

interface RouteStats {
  count: number;
  errorCount: number;
  totalLatencyMs: number;
  maxLatencyMs: number;
}

/**
 * In-process counters keyed by "METHOD route". Real numbers from real
 * requests, reset on restart. Good enough to answer "what's the error rate
 * and p-ish latency on this route right now" without standing up a separate
 * metrics stack.
 */
class MetricsStore {
  private routes = new Map<string, RouteStats>();

  record(key: string, statusCode: number, latencyMs: number): void {
    const stats = this.routes.get(key) ?? {
      count: 0,
      errorCount: 0,
      totalLatencyMs: 0,
      maxLatencyMs: 0,
    };
    stats.count += 1;
    if (statusCode >= 500) stats.errorCount += 1;
    stats.totalLatencyMs += latencyMs;
    stats.maxLatencyMs = Math.max(stats.maxLatencyMs, latencyMs);
    this.routes.set(key, stats);
  }

  snapshot() {
    const out: Record<
      string,
      {
        count: number;
        errorCount: number;
        errorRate: number;
        avgLatencyMs: number;
        maxLatencyMs: number;
      }
    > = {};
    for (const [key, stats] of this.routes.entries()) {
      out[key] = {
        count: stats.count,
        errorCount: stats.errorCount,
        errorRate: stats.count > 0 ? stats.errorCount / stats.count : 0,
        avgLatencyMs:
          stats.count > 0
            ? Math.round((stats.totalLatencyMs / stats.count) * 100) / 100
            : 0,
        maxLatencyMs: Math.round(stats.maxLatencyMs * 100) / 100,
      };
    }
    return out;
  }
}

export const metricsStore = new MetricsStore();

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;
    const routePath = (req.route && req.route.path) || req.path;
    const key = `${req.method} ${routePath}`;
    metricsStore.record(key, res.statusCode, latencyMs);
    // Structured request log, one JSON object per line.
    console.log(
      JSON.stringify({
        type: "request",
        method: req.method,
        path: routePath,
        status: res.statusCode,
        latencyMs: Math.round(latencyMs * 100) / 100,
        ts: new Date().toISOString(),
      })
    );
  });
  next();
}

import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string, secret: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn: "7d" });
}

export function requireAuth(secret: string) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "missing bearer token" });
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = jwt.verify(token, secret) as { sub: string };
      req.userId = payload.sub;
      next();
    } catch {
      return res.status(401).json({ error: "invalid or expired token" });
    }
  };
}

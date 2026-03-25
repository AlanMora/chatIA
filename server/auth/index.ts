import type { Express } from "express";

const isReplitEnvironment = !!process.env.REPL_ID && !!process.env.ISSUER_URL;

export async function setupAuth(app: Express) {
  if (isReplitEnvironment) {
    const { setupAuth: setupReplitAuth } = await import("../replit_integrations/auth/replitAuth");
    await setupReplitAuth(app);
  } else {
    const { setupJWTAuth } = await import("./jwt-auth");
    await setupJWTAuth(app);
  }
}

export async function registerAuthRoutes(app: Express) {
  if (isReplitEnvironment) {
    const { registerAuthRoutes: registerReplitAuthRoutes } = await import("../replit_integrations/auth/routes");
    registerReplitAuthRoutes(app);
  } else {
    const { registerJWTAuthRoutes } = await import("./jwt-auth");
    registerJWTAuthRoutes(app);
  }
}

export const isAuthenticated = async (req: any, res: any, next: any) => {
  if (isReplitEnvironment) {
    const { isAuthenticated: replitIsAuth } = await import("../replit_integrations/auth/replitAuth");
    return replitIsAuth(req, res, next);
  } else {
    const { isAuthenticatedJWT } = await import("./jwt-auth");
    return isAuthenticatedJWT(req, res, next);
  }
};

export { isReplitEnvironment };

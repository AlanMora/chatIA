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

export function registerAuthRoutes(app: Express) {
  if (isReplitEnvironment) {
    import("../replit_integrations/auth/routes").then(({ registerAuthRoutes }) => {
      registerAuthRoutes(app);
    });
  } else {
    import("./jwt-auth").then(({ registerJWTAuthRoutes }) => {
      registerJWTAuthRoutes(app);
    });
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

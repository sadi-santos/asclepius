/**
 * Augmenta o tipo do Express para incluir req.user,
 * preenchido pelo middleware de autenticação.
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string
      email: string
      role?: string
    }
  }
}
export {}
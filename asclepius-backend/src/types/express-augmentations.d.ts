/**
 * Augmentations para habilitar req.user no Express.
 * Cobremos os dois alvos comuns para garantir compatibilidade:
 * - express-serve-static-core (tipos internos do Express)
 * - express (às vezes o código referencia esses tipos)
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

declare module "express" {
  interface Request {
    user?: {
      id: string
      email: string
      role?: string
    }
  }
}

export {};
/**
 * Augmentation global para habilitar req.user no Express.
 * Isto é só tipo (compile-time), não muda o runtime.
 */
declare global {
  namespace Express {
    interface User {
      id: string
      email: string
      role?: string
    }
    interface Request {
      user?: User
    }
  }
}
export {};
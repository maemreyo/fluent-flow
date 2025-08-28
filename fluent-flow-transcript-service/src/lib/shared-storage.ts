// In-memory storage for shared questions
// In production, this should be replaced with a database

// Use globalThis to ensure storage persists across HMR in development
declare global {
  var __sharedQuestions: Map<string, any> | undefined
}

export const sharedQuestions = globalThis.__sharedQuestions ?? new Map<string, any>()

if (process.env.NODE_ENV === 'development') {
  globalThis.__sharedQuestions = sharedQuestions
}
// Vercel rileva le funzioni solo in api/ nella radice: questo file ri-esporta quella di backend/.
export { GET } from '../backend/api/health.js'

// Registers the outbox handlers that live outside src/server/outbox-handlers.ts.
// Imported once by worker/index.ts. Add one import per module that has handlers.
import { registerHandler } from '@/server/outbox-handlers'
import { processFile } from '@/server/services/files/process'

registerHandler('image.process', async ({ fileId }) => processFile(fileId))

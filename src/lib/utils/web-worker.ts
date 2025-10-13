/**
 * Web Worker utilities for offloading heavy computations
 * Helps prevent main thread blocking and improves INP
 */

/**
 * Create an inline Web Worker from a function
 * Useful for one-off computations without creating separate worker files
 */
export function createInlineWorker<T, R>(
  workerFunction: (data: T) => R
): {
  execute: (data: T) => Promise<R>
  terminate: () => void
} {
  // Convert function to blob URL for worker
  const blob = new Blob(
    [
      `
      self.onmessage = function(e) {
        const result = (${workerFunction.toString()})(e.data);
        self.postMessage(result);
      }
    `,
    ],
    { type: 'application/javascript' }
  )

  const workerUrl = URL.createObjectURL(blob)
  const worker = new Worker(workerUrl)

  return {
    execute: (data: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        worker.onmessage = (e: MessageEvent) => resolve(e.data)
        worker.onerror = (e: ErrorEvent) => reject(e.error)
        worker.postMessage(data)
      })
    },
    terminate: () => {
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
    },
  }
}

/**
 * Predefined processor types for Web Worker operations
 * Type-safe approach that prevents code injection vulnerabilities
 */
export enum ProcessorType {
  SORT_NUMBERS = 'SORT_NUMBERS',
  FILTER_NULLS = 'FILTER_NULLS',
  MAP_TO_UPPERCASE = 'MAP_TO_UPPERCASE',
  PARSE_JSON = 'PARSE_JSON',
}

/**
 * Process large arrays in Web Worker with predefined, type-safe processors
 * SECURITY: Uses predefined processor types instead of dynamic function execution
 * Prevents main thread blocking for heavy data transformations
 */
export async function processArrayInWorker<T, R>(
  items: T[],
  processorType: ProcessorType
): Promise<R[]> {
  // Small arrays don't need worker overhead
  if (items.length < 100) {
    return items.map((item) => applyProcessor(item, processorType)) as R[]
  }

  const worker = createInlineWorker((data: { items: T[]; type: ProcessorType }) => {
    // Predefined processors - no dynamic code execution
    const processors = {
      [ProcessorType.SORT_NUMBERS]: (item: unknown) => item,
      [ProcessorType.FILTER_NULLS]: (item: unknown) => item !== null && item !== undefined,
      [ProcessorType.MAP_TO_UPPERCASE]: (item: unknown) =>
        typeof item === 'string' ? item.toUpperCase() : item,
      [ProcessorType.PARSE_JSON]: (item: unknown) =>
        typeof item === 'string' ? JSON.parse(item) : item,
    }

    const processor = processors[data.type]
    if (!processor) {
      throw new Error(`Unknown processor type: ${data.type}`)
    }

    return data.items.map(processor)
  })

  try {
    const result = await worker.execute({
      items,
      type: processorType,
    })
    return result as R[]
  } finally {
    worker.terminate()
  }
}

/**
 * Apply processor in main thread (for small arrays)
 */
function applyProcessor<T>(item: T, type: ProcessorType): unknown {
  switch (type) {
    case ProcessorType.SORT_NUMBERS:
      return item
    case ProcessorType.FILTER_NULLS:
      return item !== null && item !== undefined
    case ProcessorType.MAP_TO_UPPERCASE:
      return typeof item === 'string' ? (item as string).toUpperCase() : item
    case ProcessorType.PARSE_JSON:
      return typeof item === 'string' ? JSON.parse(item as string) : item
    default:
      return item
  }
}

/**
 * Compute expensive calculations in Web Worker
 * Example: Image processing, data sorting, complex algorithms
 */
export async function computeInWorker<T, R>(
  data: T,
  computationFn: (data: T) => R
): Promise<R> {
  const worker = createInlineWorker(computationFn)

  try {
    const result = await worker.execute(data)
    return result
  } finally {
    worker.terminate()
  }
}

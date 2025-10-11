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
 * Process large arrays in Web Worker
 * Prevents main thread blocking for heavy data transformations
 */
export async function processArrayInWorker<T, R>(
  items: T[],
  processorFn: (item: T) => R
): Promise<R[]> {
  // Small arrays don't need worker overhead
  if (items.length < 100) {
    return items.map(processorFn)
  }

  const worker = createInlineWorker((data: { items: T[]; fn: string }) => {
    const processor = new Function('return ' + data.fn)() as (item: T) => R
    return data.items.map(processor)
  })

  try {
    const result = await worker.execute({
      items,
      fn: processorFn.toString(),
    })
    return result
  } finally {
    worker.terminate()
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

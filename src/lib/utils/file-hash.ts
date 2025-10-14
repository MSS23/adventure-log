/**
 * File hashing utilities for duplicate detection
 */

/**
 * Generate SHA-256 hash of a file
 * @param file - File object to hash
 * @returns Promise resolving to hex string hash
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Generate hash for multiple files
 * @param files - Array of File objects
 * @returns Promise resolving to Map of file name to hash
 */
export async function hashFiles(files: File[]): Promise<Map<string, string>> {
  const hashes = new Map<string, string>()

  await Promise.all(
    files.map(async (file) => {
      const hash = await hashFile(file)
      hashes.set(file.name, hash)
    })
  )

  return hashes
}

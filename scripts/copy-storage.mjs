import { createClient } from '@supabase/supabase-js'

const required = [
  'SOURCE_PROJECT_URL',
  'SOURCE_SERVICE_ROLE_KEY',
  'TARGET_PROJECT_URL',
  'TARGET_SERVICE_ROLE_KEY',
]

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`)
  }
}

const sourceRest = createClient(
  process.env.SOURCE_PROJECT_URL,
  process.env.SOURCE_SERVICE_ROLE_KEY,
  { db: { schema: 'storage' } }
)

const sourceStorage = createClient(
  process.env.SOURCE_PROJECT_URL,
  process.env.SOURCE_SERVICE_ROLE_KEY
)

const targetStorage = createClient(
  process.env.TARGET_PROJECT_URL,
  process.env.TARGET_SERVICE_ROLE_KEY
)

async function listAllObjects() {
  const pageSize = 1000
  let offset = 0
  const all = []

  while (true) {
    const { data, error } = await sourceRest
      .from('objects')
      .select('*')
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return all
}

async function main() {
  const objects = await listAllObjects()
  console.log(`Found ${objects.length} storage objects to copy.`)

  for (const objectData of objects) {
    const objectPath = objectData.name
    const bucket = objectData.bucket_id

    try {
      console.log(`Copying ${bucket}/${objectPath}`)

      const { data, error: downloadError } = await sourceStorage.storage
        .from(bucket)
        .download(objectPath)

      if (downloadError) throw downloadError

      const metadata = objectData.metadata || {}

      const { error: uploadError } = await targetStorage.storage
        .from(bucket)
        .upload(objectPath, data, {
          upsert: true,
          contentType: metadata.mimetype,
          cacheControl: metadata.cacheControl,
        })

      if (uploadError) throw uploadError
    } catch (error) {
      console.error(`Failed to copy ${bucket}/${objectPath}`)
      console.error(error)
    }
  }

  console.log('Storage copy finished.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

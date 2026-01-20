import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Storage helper functions
export async function uploadImage(
  file: File,
  projectId: string,
  userId: string
): Promise<{ url: string; path: string } | null> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${projectId}/${Date.now()}.${fileExt}`

  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
    path: data.path,
  }
}

export async function deleteImage(path: string): Promise<boolean> {
  const { error } = await supabaseAdmin.storage.from('images').remove([path])
  return !error
}

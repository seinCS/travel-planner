/**
 * Supabase Storage 버킷 설정 스크립트
 * 실행: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// .env 또는 .env.local 파일 직접 파싱
function loadEnv() {
  try {
    // .env.local 먼저 시도, 없으면 .env
    let envPath = resolve(process.cwd(), '.env.local')
    try {
      readFileSync(envPath)
    } catch {
      envPath = resolve(process.cwd(), '.env')
    }
    const envContent = readFileSync(envPath, 'utf-8')
    console.log('  Loading env from:', envPath)
    const envVars: Record<string, string> = {}

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim()
        }
      }
    })

    return envVars
  } catch (error) {
    console.error('Failed to load .env.local:', error)
    return {}
  }
}

const env = loadEnv()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  console.error('\nPlease check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...\n')
  console.log('  Supabase URL:', supabaseUrl)

  // 1. 기존 버킷 확인
  console.log('\n📦 Checking existing buckets...')
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('❌ Failed to list buckets:', listError.message)
    process.exit(1)
  }

  console.log('  Existing buckets:', buckets?.map(b => b.name).join(', ') || 'none')

  // 2. 'images' 버킷 생성
  const imagesBucket = buckets?.find(b => b.name === 'images')

  if (imagesBucket) {
    console.log('\n✅ "images" bucket already exists')
  } else {
    console.log('\n📦 Creating "images" bucket...')
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })

    if (error) {
      console.error('❌ Failed to create bucket:', error.message)
      process.exit(1)
    }

    console.log('✅ "images" bucket created successfully')
  }

  console.log('\n🔐 Bucket configuration:')
  console.log('   - Public access: enabled')
  console.log('   - Max file size: 10MB')
  console.log('   - Allowed types: jpeg, png, webp, gif')

  console.log('\n✨ Storage setup complete!')
}

setupStorage().catch(console.error)

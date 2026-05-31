// Re-export the existing service-role client under the path the billing code
// imports from (`@/lib/supabase/service`). The implementation lives in
// `lib/supabase-server.ts`; this avoids duplicating the credential handling.
export { createServiceClient } from '@/lib/supabase-server'

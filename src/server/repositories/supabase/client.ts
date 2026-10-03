/**
 * Phase 3 kept the service-role client here. Phase 4 moved the canonical
 * implementation to `src/lib/supabase/service.ts` so the three Supabase
 * clients (browser / server / service) live side by side and the separation is
 * obvious. This module is kept as a thin re-export so the Phase 3 repository
 * imports stay untouched.
 */
export { supabaseService as supabaseAdmin, resetSupabaseServiceClient as resetSupabaseClient } from "@/lib/supabase/service";

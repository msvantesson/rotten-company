'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect } from 'react'

export default function RoleDebugPage() {
  useEffect(() => {
    const checkRole = async () => {
      const { data, error } = await supabase.rpc('debug_role')
      console.log('role debug:', data, error)
    }
    checkRole()
  }, [])

  return <div>Open your browser console to see role debug output</div>
}

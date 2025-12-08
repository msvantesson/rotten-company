'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect } from 'react'

export default function RoleDebug() {
  useEffect(() => {
    const checkRole = async () => {
      const { data, error } = await supabase.rpc('debug_role')
      console.log('role debug:', data, error)
    }
    checkRole()
  }, [])

  return <div>Check console for role debug</div>
}

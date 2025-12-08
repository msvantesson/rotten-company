'use client'

import { supabase } from '@/app/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function RoleDebugPage() {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const checkRole = async () => {
      const { data, error } = await supabase.rpc('debug_role')
      console.log('role debug:', data, error)
      setResult({ data, error })
    }
    checkRole()
  }, [])

  return (
    <div>
      <h1>Role Debug</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <p>Open your browser console to see detailed output</p>
    </div>
  )
}

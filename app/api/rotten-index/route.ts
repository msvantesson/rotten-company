import { NextResponse } from 'next/server';
import { supabaseRoute } from '@/lib/supabase-route';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const type = searchParams.get('type') ?? 'company';
  const limit = Number(searchParams.get('limit') ?? 25);
  const offset = Number(searchParams.get('offset') ?? 0);

  console.log('[rotten-index] request', { type, limit, offset });

  const supabase = await supabaseRoute();

  const { data, error } = await supabase
    .from('global_rotten_index')
    .select('*')
    .eq('entity_type', type)
    .order('rotten_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[rotten-index] query failed', error);
    return NextResponse.json({ error: 'query failed' }, { status: 500 });
  }

  console.log('[rotten-index] ok', { rows: data.length });

  return NextResponse.json({ type, rows: data });
}

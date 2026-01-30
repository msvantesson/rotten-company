import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const type = searchParams.get('type') ?? 'company';
  const limit = Number(searchParams.get('limit') ?? 25);
  const offset = Number(searchParams.get('offset') ?? 0);

  console.log('[rotten-index] request', {
    type,
    limit,
    offset,
    url: req.url,
  });

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('global_rotten_index')
    .select('*')
    .eq('entity_type', type)
    .order('rotten_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[rotten-index] query failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    return NextResponse.json(
      { error: 'query failed' },
      { status: 500 }
    );
  }

  console.log('[rotten-index] query ok', {
    rows: data.length,
    sample: data.slice(0, 2),
  });

  return NextResponse.json({
    type,
    rows: data,
  });
}

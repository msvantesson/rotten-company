const { data: evidence } = await supabase
  .from('evidence')
  .select('*')
  .eq('id', evidenceId)
  .single();

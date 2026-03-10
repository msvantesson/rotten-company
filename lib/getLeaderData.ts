import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getLeaderData = async () => {
    const { data, error } = await supabase
        .from('leaders')
        .select('id, name, leaders.something_else') // Removed leaders.rotten_score
        .eq('active', true);

    if (error) {
        if (error.code === 'PGRST205') { // Check for the specific error code
            return { inequality: null, categories: [] };
        } else {
            console.error('Error fetching leader data:', error);
        }
    }

    return data;
};
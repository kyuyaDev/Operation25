/**
 * Supabase Integration for Operation 25
 */

const SUPABASE_URL = 'https://qsibpohhbitqjfwaxqkh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R5lbrW_qP209bUb89d2UFA_oUUxhwlx';
const TABLE_NAME = 'math25_ranking';

// Initialize the Supabase client conditionally
let supabase = null;

if (window.supabase) {
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
} else {
  console.warn('Supabase global not found. Ensure script tag is loaded.');
}

/**
 * Save user ranking to Supabase
 * @param {string} playerName 
 * @param {number} totalTime in seconds 
 */
export async function saveRanking(playerName, totalTime) {
  if (!supabase) {
    console.warn('Supabase not configured. Mocking save action.');
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([
        { player_name: playerName, total_time: totalTime }
      ]);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error saving ranking:', error);
    return { success: false, error };
  }
}

/**
 * Fetch Top 10 rankings sorted by ascending total_time (lowest time best)
 */
export async function getRankings() {
  if (!supabase) {
    return {
      success: true,
      mocked: true,
      data: [
        { player_name: '고수', total_time: 154.34 },
        { player_name: '연산왕', total_time: 198.51 },
        { player_name: '초보', total_time: 245.99 }
      ]
    };
  }

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('player_name, total_time')
      .order('total_time', { ascending: true })
      .limit(10);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return { success: false, error };
  }
}

import { supabase } from '../services/supabaseClient';

export const testUserIsolation = async () => {
  try {
    console.log('=== Testing User Data Isolation ===');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user authenticated');
      return;
    }
    
    console.log('Current user ID:', user.id);
    
    // Test user_preferences table
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id);
    
    if (prefError) {
      console.error('Error fetching user preferences:', prefError);
    } else {
      console.log('User preferences found:', preferences?.length || 0);
      preferences?.forEach(pref => {
        console.log(`- ${pref.preference_key}:`, pref.preference_value);
      });
    }
    
    // Test quiz_results table
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.id);
    
    if (quizError) {
      console.error('Error fetching quiz results:', quizError);
    } else {
      console.log('Quiz results found:', quizResults?.length || 0);
    }
    
    // Test tool_usage table
    const { data: toolUsage, error: toolError } = await supabase
      .from('tool_usage')
      .select('*')
      .eq('user_id', user.id);
    
    if (toolError) {
      console.error('Error fetching tool usage:', toolError);
    } else {
      console.log('Tool usage found:', toolUsage?.length || 0);
    }
    
    // Test confidence_history table
    const { data: confidenceHistory, error: confError } = await supabase
      .from('confidence_history')
      .select('*')
      .eq('user_id', user.id);
    
    if (confError) {
      console.error('Error fetching confidence history:', confError);
    } else {
      console.log('Confidence history found:', confidenceHistory?.length || 0);
    }
    
    console.log('=== User Isolation Test Complete ===');
    
  } catch (error) {
    console.error('Error testing user isolation:', error);
  }
}; 
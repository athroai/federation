/**
 * 🔧 Data Persistence Debug Helper
 * 
 * Run this in browser console to check data persistence status
 * Usage: Copy and paste this entire script into browser console
 */

console.log('🔧 Athro Data Persistence Debugger');
console.log('=====================================');

// Check localStorage data
const athroKeys = [
  'subjectConfidence',
  'finalAthros', 
  'athroConfidence',
  'athroPriorities',
  'calendarEvents',
  'studentAvailability',
  'selectedWeekType',
  'isFullDay',
  'athro_workspace_selected_athros',
  'athro_workspace_confidence_levels'
];

console.log('\n📦 LocalStorage Data:');
console.log('====================');

let hasData = false;
athroKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    hasData = true;
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        console.log(`✅ ${key}: Array with ${parsed.length} items`);
        if (parsed.length > 0) {
          console.log(`   First item:`, parsed[0]);
        }
      } else if (typeof parsed === 'object') {
        const keys = Object.keys(parsed);
        console.log(`✅ ${key}: Object with ${keys.length} keys`);
        if (keys.length > 0) {
          console.log(`   Keys:`, keys.slice(0, 3));
        }
      } else {
        console.log(`✅ ${key}:`, parsed);
      }
    } catch (e) {
      console.log(`✅ ${key}:`, value);
    }
  } else {
    console.log(`❌ ${key}: Not found`);
  }
});

if (!hasData) {
  console.log('⚠️  No Athro data found in localStorage');
  console.log('   This is normal for fresh installs or after data migration');
}

// Check which app we're in
const hostname = window.location.hostname;
const port = window.location.port;
let currentApp = 'Unknown';

if (port === '5173') currentApp = 'Dashboard (athro-dashboard)';
else if (port === '5174') currentApp = 'Metrics (athro-metrics)';  
else if (port === '5175') currentApp = 'Workspace (athro-workspace-2)';
else if (port === '5176') currentApp = 'Calendar/Onboarding (lovable-athro-ai-3)';

console.log(`\n🌐 Current App: ${currentApp}`);
console.log(`   URL: ${window.location.href}`);

// Check authentication status
console.log('\n👤 Authentication Status:');
console.log('========================');

// Try to detect user authentication
const hasSupabase = typeof supabase !== 'undefined';
if (hasSupabase) {
  console.log('✅ Supabase client available');
  // Try to get current user (async)
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.log('❌ Auth error:', error.message);
    } else if (user) {
      console.log('✅ User authenticated:', user.id);
      console.log('   Email:', user.email);
      
      // Check user preferences in Supabase
      supabase
        .from('user_preferences')
        .select('preference_key, preference_value')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.log('❌ Error loading Supabase preferences:', error.message);
          } else {
            console.log('\n🗄️  Supabase User Preferences:');
            console.log('==============================');
            if (data && data.length > 0) {
              data.forEach(pref => {
                console.log(`✅ ${pref.preference_key}: ${typeof pref.preference_value === 'object' ? JSON.stringify(pref.preference_value).substring(0, 100) + '...' : pref.preference_value}`);
              });
            } else {
              console.log('❌ No preferences found in Supabase');
            }
          }
        });
    } else {
      console.log('❌ No authenticated user (anonymous mode)');
    }
  });
} else {
  console.log('❌ Supabase client not available (check if on correct app)');
}

// Check for common issues
console.log('\n🔍 Issue Detection:');
console.log('==================');

const finalAthros = localStorage.getItem('finalAthros');
const subjectConfidence = localStorage.getItem('subjectConfidence');

if (finalAthros || subjectConfidence) {
  console.log('✅ Athro selection data found');
  
  if (finalAthros) {
    try {
      const parsed = JSON.parse(finalAthros);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`   📊 ${parsed.length} Athros selected`);
        const withConfidence = parsed.filter(a => a.confidenceLevel);
        console.log(`   📈 ${withConfidence.length} have confidence levels`);
      }
    } catch (e) {
      console.log('❌ Error parsing finalAthros:', e.message);
    }
  }
  
  if (subjectConfidence) {
    try {
      const parsed = JSON.parse(subjectConfidence);
      const subjects = Object.keys(parsed);
      console.log(`   🎯 Confidence set for ${subjects.length} subjects:`, subjects);
    } catch (e) {
      console.log('❌ Error parsing subjectConfidence:', e.message);
    }
  }
} else {
  console.log('⚠️  No Athro selection data found');
  console.log('   Either fresh install or data was migrated to Supabase');
}

// Quick fix suggestions
console.log('\n💡 Quick Actions:');
console.log('================');
console.log('• To clear all data: run clearAllAthroData()');
console.log('• To create test data: run createTestData()');
console.log('• To check migration status: look for migration logs above');

// Helper functions
window.clearAllAthroData = function() {
  athroKeys.forEach(key => localStorage.removeItem(key));
  console.log('🧹 All Athro data cleared from localStorage');
};

window.createTestData = function() {
  const testData = {
    finalAthros: [
      { id: 'athro-maths', subject: 'Mathematics', confidenceLevel: 'HIGH' },
      { id: 'athro-english', subject: 'English', confidenceLevel: 'MEDIUM' },
      { id: 'athro-science', subject: 'Science', confidenceLevel: 'LOW' }
    ],
    subjectConfidence: {
      'athro-maths': 'HIGH',
      'athro-english': 'MEDIUM', 
      'athro-science': 'LOW'
    }
  };
  
  localStorage.setItem('finalAthros', JSON.stringify(testData.finalAthros));
  localStorage.setItem('subjectConfidence', JSON.stringify(testData.subjectConfidence));
  console.log('🧪 Test data created - reload page to see changes');
};

console.log('\n✅ Debug complete! Check output above for issues.');
console.log('📞 If you see persistent issues, copy this output for support.'); 
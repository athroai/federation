import WorkPage from './pages/WorkPage';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import AuthWrapper from './components/AuthWrapper';
import 'react-multi-carousel/lib/styles.css';
import './App.css';

function App({ selectedAthros, confidenceLevels, prioritySubjects }: any) {
  return (
    <AuthProvider>
      <TimerProvider>
        <AuthWrapper>
          <div className="app-container">
            <WorkPage 
              selectedAthros={selectedAthros}
              confidenceLevels={confidenceLevels}
              prioritySubjects={prioritySubjects}
            />
          </div>
        </AuthWrapper>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;

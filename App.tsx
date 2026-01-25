import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './src/components/Home';
import Session from './src/components/Session';

// Defer third-party libraries to load after hydration (bundle-defer-third-party)
const SpeedInsights = lazy(() => 
  import('@vercel/speed-insights/react').then(module => ({ default: module.SpeedInsights }))
);

const App: React.FC = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Load analytics after hydration
    setIsHydrated(true);
  }, []);

  return (
    <Router>
      {isHydrated && (
        <Suspense fallback={null}>
          <SpeedInsights />
        </Suspense>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session" element={<Session />} />
      </Routes>
    </Router>
  );
};

export default App;

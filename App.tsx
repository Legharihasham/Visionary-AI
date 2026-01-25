import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './src/components/Home';
import Session from './src/components/Session';

const App: React.FC = () => {
  return (
    <Router>

      <SpeedInsights />
      <Analytics />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/session" element={<Session />} />
      </Routes>
    </Router>
  );
};

export default App;

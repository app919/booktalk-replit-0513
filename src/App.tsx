/**
 * Copyright 2025 BookTalk. All Rights Reserved.
 */

import { Helmet } from 'react-helmet';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import '@arco-design/web-react/dist/css/arco.css';

function App() {
  return (
    <BrowserRouter>
      <Helmet>
        <link rel="icon" href="/logo.png" />
      </Helmet>
      <Routes>
        <Route path="/">
          <Route index element={<MainPage />} />
          <Route path="/*" element={<MainPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

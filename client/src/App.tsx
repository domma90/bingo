import { Routes, Route } from 'react-router-dom';
import PlayerView from './views/PlayerView';
import AdminView from './views/AdminView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerView />} />
      <Route path="/admin" element={<AdminView />} />
    </Routes>
  );
}

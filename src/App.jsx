import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login/Login';
import Registro from './pages/Registro/Registro';
import AdminDashboard from './pages/Administrador/AdminDashboard';
import SuperDashboard from './pages/Supervisor/SuperDashboard';
import TecDashboard from './pages/Tecnico/TecDashboard';
import AlmacenDashboard from './pages/Almacenista/AlmacenDashboard';
import OperDashboard from './pages/Operativo/OperDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/supervisor/dashboard" element={<SuperDashboard />} />
        <Route path="/tecnico/dashboard" element={<TecDashboard />} />
        <Route path="/almacen/dashboard" element={<AlmacenDashboard />} />
        <Route path="/operativo/dashboard" element={<OperDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
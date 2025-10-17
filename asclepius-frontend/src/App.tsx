import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientsList from "./pages/patients/PatientsList";
import PatientForm from "./pages/patients/PatientForm";
import ProfessionalsList from "./pages/professionals/ProfessionalsList";
import ProfessionalForm from "./pages/professionals/ProfessionalForm";
import AppointmentsList from "./pages/appointments/AppointmentsList";
import AppointmentForm from "./pages/appointments/AppointmentForm";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Pacientes */}
        <Route path="patients" element={<PatientsList />} />
        <Route path="patients/new" element={<PatientForm />} />
        <Route path="patients/:id/edit" element={<PatientForm />} />

        {/* Profissionais */}
        <Route path="professionals" element={<ProfessionalsList />} />
        <Route path="professionals/new" element={<ProfessionalForm />} />
        <Route path="professionals/:id/edit" element={<ProfessionalForm />} />

        {/* Agendamentos */}
        <Route path="appointments" element={<AppointmentsList />} />
        <Route path="appointments/new" element={<AppointmentForm />} />
        <Route path="appointments/:id/edit" element={<AppointmentForm />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

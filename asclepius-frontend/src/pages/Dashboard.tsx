import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, UserCheck, Clock, Activity, TrendingUp } from "lucide-react";
import { api, toArray } from "../lib/api";
import type { Patient, Professional, Appointment } from "../types";
import LoadingSpinner from "../components/ui/LoadingSpinner";

function Stat({title, value, icon:Icon, hint}:{title:string; value:string|number; icon: any; hint?:string}){
  return <div className="bg-white p-6 rounded-xl border hover:shadow-sm transition">
    <div className="flex items-center justify-between">
      <div><p className="text-sm text-gray-600">{title}</p><p className="text-2xl font-bold">{value}</p></div>
      <div className="p-3 rounded-full bg-blue-100 text-blue-700"><Icon/></div>
    </div>
    {hint && <p className="text-xs text-green-700 mt-2 flex items-center gap-1"><TrendingUp size={14}/>{hint}</p>}
  </div>;
}

export default function Dashboard(){
  const { data: patients=[], isLoading: lp } = useQuery({ queryKey:["patients"], queryFn: async()=>toArray<Patient>((await api.get("/patients")).data) });
  const { data: pros=[],      isLoading: lr } = useQuery({ queryKey:["professionals"], queryFn: async()=>toArray<Professional>((await api.get("/professionals")).data) });
  const { data: apts=[],      isLoading: la } = useQuery({ queryKey:["appointments"],   queryFn: async()=>toArray<Appointment>((await api.get("/appointments")).data) });

  if(lp||lr||la) return <div className="h-64 grid place-items-center"><LoadingSpinner size="lg"/></div>;

  const today = new Date().toISOString().slice(0,10);
  const todayApts = apts.filter(a=>a.scheduledAt?.startsWith(today));
  const confirmed = apts.filter(a=>a.status==="CONFIRMED");
  const completed = apts.filter(a=>a.status==="COMPLETED");
  const activePatients = patients.filter(p=>p.isActive).length;
  const activePros = pros.filter(p=>p.isActive).length;

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-gray-600">Visão geral</p></div>
      <div className="flex items-center gap-2 text-sm text-gray-600"><Activity className="h-4 w-4 text-green-500"/>Atualizado {new Date().toLocaleTimeString("pt-BR")}</div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat title="Pacientes Ativos" value={activePatients} icon={Users} hint={`${patients.length} total`}/>
      <Stat title="Profissionais" value={activePros} icon={UserCheck} hint={`${pros.length} total`}/>
      <Stat title="Consultas Hoje" value={todayApts.length} icon={Calendar} hint={`${confirmed.length} confirmadas`}/>
      <Stat title="Taxa de Conclusão" value={`${apts.length? Math.round((completed.length/apts.length)*100):0}%`} icon={Clock} hint={`${completed.length} concluídas`}/>
    </div>
  </div>;
}

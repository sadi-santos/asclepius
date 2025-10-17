import React from "react";
import { FileX } from "lucide-react";
export default function EmptyState({ title, description, action }:{title:string; description?:string; action?:React.ReactNode;}){
  return <div className="flex flex-col items-center justify-center py-12">
    <div className="p-3 bg-gray-100 rounded-full mb-3"><FileX className="h-8 w-8 text-gray-400"/></div>
    <h3 className="text-lg font-medium">{title}</h3>
    {description && <p className="text-sm text-gray-500 mb-3">{description}</p>}
    {action}
  </div>;
}

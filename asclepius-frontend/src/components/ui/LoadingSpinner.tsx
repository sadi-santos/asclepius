import React from "react";
export default function LoadingSpinner({ size="md" }:{size?:"sm"|"md"|"lg"}){
  const map={ sm:"h-4 w-4 border-2", md:"h-8 w-8 border-4", lg:"h-12 w-12 border-4" } as const;
  return <div className="grid place-items-center"><div className={`animate-spin rounded-full border-t-blue-600 border-r-transparent border-b-blue-600 border-l-transparent ${map[size]}`} /></div>;
}

import React from 'react';

export default function SkeletonDashboard({ isGlass }) {
   const bgCard = isGlass ? 'bg-[#1e293b]/50 border-white/5' : 'bg-white border-gray-100';
   const shimmer = isGlass ? 'bg-white/10' : 'bg-gray-200';
   const shimmerDark = isGlass ? 'bg-white/20' : 'bg-gray-300';
   const shimmerText = isGlass ? 'bg-white/5' : 'bg-gray-100';

   return (
      <div className="max-w-5xl mx-auto p-4 mt-2 pb-28 md:pb-10 md:mt-4 space-y-6 animate-pulse">

         {/* 1. Navbar Falso (Solo visual) */}
         <div className="hidden md:flex justify-between items-center mb-6">
            <div className={`h-8 w-32 ${shimmer} rounded-lg`}></div>
            <div className={`h-8 w-8 ${shimmer} rounded-full`}></div>
         </div>

         {/* 2. Tarjeta Grande de Deuda (KPI) */}
         <div className={`${bgCard} p-6 rounded-2xl border h-48 flex flex-col justify-between`}>
            <div className="space-y-3">
               <div className={`h-4 w-32 ${shimmer} rounded`}></div>
               <div className={`h-10 w-48 ${shimmerDark} rounded-lg`}></div>
            </div>
            <div className="flex gap-10 mt-4">
               <div className={`h-10 w-24 ${shimmer} rounded`}></div>
               <div className={`h-10 w-24 ${shimmer} rounded`}></div>
            </div>
         </div>

         {/* 3. Área del Gráfico / Botones */}
         <div className={`${bgCard} p-6 rounded-2xl border h-[400px]`}>
            <div className="flex justify-between mb-6">
               <div className={`h-6 w-40 ${shimmer} rounded`}></div>
               <div className={`h-8 w-32 ${shimmer} rounded-lg`}></div>
            </div>
            {/* Barras Falsas */}
            <div className="flex items-end justify-between h-64 px-4 gap-2">
               <div className={`w-full ${shimmer} rounded-t-lg h-[40%]`}></div>
               <div className={`w-full ${shimmer} rounded-t-lg h-[70%]`}></div>
               <div className={`w-full ${shimmer} rounded-t-lg h-[50%]`}></div>
               <div className={`w-full ${shimmer} rounded-t-lg h-[80%]`}></div>
               <div className={`w-full ${shimmer} rounded-t-lg h-[60%]`}></div>
               <div className={`w-full ${shimmer} rounded-t-lg h-[30%]`}></div>
            </div>
         </div>

         {/* 4. Lista de Compras (Falsa) */}
         <div className="space-y-3">
            {[1, 2, 3].map((i) => (
               <div key={i} className={`${bgCard} h-20 rounded-lg border p-3 flex justify-between items-center`}>
                  <div className="space-y-2">
                     <div className={`h-4 w-32 ${shimmer} rounded`}></div>
                     <div className={`h-3 w-20 ${shimmerText} rounded`}></div>
                  </div>
                  <div className={`h-6 w-16 ${shimmer} rounded`}></div>
               </div>
            ))}
         </div>

      </div>
   );
}
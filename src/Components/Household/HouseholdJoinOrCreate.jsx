import React from 'react';

export default function HouseholdJoinOrCreate({ 
    isGlass, 
    handleCreate, 
    createStatus, 
    joinCode, 
    setJoinCode, 
    handleJoin, 
    joinStatus 
}) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-3xl text-center space-y-4">
                <div>
                    <p className={`font-bold mb-2 ${isGlass ? 'text-yellow-200' : 'text-yellow-700'}`}>¡Sin Hogar Asignado!</p>
                    <p className={`text-sm ${isGlass ? 'text-yellow-100/70' : 'text-yellow-800/70'}`}>Es necesario activar tu hogar para generar un código y compartir gastos.</p>
                </div>
                <button aria-label="Acción" type="button"
                    onClick={handleCreate}
                    disabled={createStatus === 'creating'}
                    className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                    {createStatus === 'creating' ? 'Creando...' : 'Crear Mi Hogar (Código Random)'}
                </button>
            </div>

            <div className={`p-6 rounded-3xl border ${isGlass ? 'bg-gradient-to-br from-indigo-900/40 to-black border-indigo-500/30' : 'bg-white border-indigo-100 shadow-lg'}`}>
                <h3 className={`text-lg font-bold mb-2 ${isGlass ? 'text-indigo-200' : 'text-indigo-600'}`}>¿Te invitaron?</h3>
                <p className={`text-sm mb-4 ${isGlass ? 'text-gray-400' : 'text-gray-500'}`}>Si tu pareja creó el hogar, ingresá su código aquí para unirte.</p>

                <div className="flex flex-col md:flex-row gap-3">
                    <input autoComplete="off" id="input-field"
                        type="text"
                        placeholder="000-000"
                        maxLength={6}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        className={`w-full border rounded-2xl px-4 py-4 text-center tracking-widest font-mono text-lg transition-colors focus:outline-none focus:border-indigo-500 ${isGlass ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    />
                    <button aria-label="Acción" type="button"
                        onClick={handleJoin}
                        disabled={joinStatus === 'searching' || joinCode.length < 6}
                        className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold disabled:opacity-50 hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-900/50"
                    >
                        Confirmar y Unirme
                    </button>
                </div>
                {joinStatus === 'searching' && <p className="text-indigo-400 text-sm mt-2 text-center animate-pulse">Buscando hogar...</p>}
                {joinStatus === 'success' && <p className="text-green-500 text-sm mt-2 text-center font-bold">¡Éxito! Recargando...</p>}
                {joinStatus === 'error_not_found' && <p className="text-red-400 text-sm mt-2 text-center">Código incorrecto.</p>}
                {joinStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">Ocurrió un error.</p>}
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';

// MOCK DATA (10 partidos falsos: 5 Local, 5 Visitante)
const mockDataHome = [
  { id: 1, rival: 'Chelsea', home_goals: 2, away_goals: 1, corners: 10, cards: 3, date: '2026-04-15' },
  { id: 2, rival: 'Arsenal', home_goals: 1, away_goals: 1, corners: 8, cards: 5, date: '2026-04-10' },
  { id: 3, rival: 'Liverpool', home_goals: 3, away_goals: 0, corners: 12, cards: 2, date: '2026-04-05' },
  { id: 4, rival: 'Newcastle', home_goals: 0, away_goals: 2, corners: 6, cards: 4, date: '2026-03-28' },
  { id: 5, rival: 'Everton', home_goals: 2, away_goals: 2, corners: 11, cards: 6, date: '2026-03-20' },
];

const mockDataAway = [
  { id: 6, rival: 'Aston Villa', home_goals: 1, away_goals: 3, corners: 9, cards: 4, date: '2026-04-14' },
  { id: 7, rival: 'West Ham', home_goals: 0, away_goals: 0, corners: 5, cards: 2, date: '2026-04-09' },
  { id: 8, rival: 'Brighton', home_goals: 2, away_goals: 1, corners: 14, cards: 7, date: '2026-04-04' },
  { id: 9, rival: 'Fulham', home_goals: 3, away_goals: 3, corners: 7, cards: 3, date: '2026-03-27' },
  { id: 10, rival: 'Wolves', home_goals: 1, away_goals: 0, corners: 8, cards: 1, date: '2026-03-21' },
];

export default function EscanerDiarioPage() {
  const [statType, setStatType] = useState('goles');
  const [marketLine, setMarketLine] = useState('2.5');

  // Evalúa si el partido cumple la métrica
  const checkHit = (match: any) => {
    const totalGoals = match.home_goals + match.away_goals;
    const line = parseFloat(marketLine);

    if (statType === 'goles') {
      if (marketLine === 'btts') return match.home_goals > 0 && match.away_goals > 0;
      return totalGoals > line;
    }
    if (statType === 'corners') {
      return match.corners > line;
    }
    if (statType === 'tarjetas') {
      return match.cards > line;
    }
    return false;
  };

  // Renderiza una fila de la tabla
  const renderRow = (match: any) => {
    const isHit = checkHit(match);
    const totalGoals = match.home_goals + match.away_goals;
    
    let displayValue = '';
    if (statType === 'goles') {
      displayValue = marketLine === 'btts' ? `${match.home_goals}-${match.away_goals}` : `${totalGoals}`;
    } else if (statType === 'corners') {
      displayValue = `${match.corners}`;
    } else if (statType === 'tarjetas') {
      displayValue = `${match.cards}`;
    }

    return (
      <div 
        key={match.id} 
        className="flex items-center justify-between p-3 border-b border-neutral-800/50 hover:bg-neutral-800/80 transition-colors group"
      >
        <div className="flex flex-col">
          <span className="text-neutral-300 font-medium group-hover:text-white transition-colors">{match.rival}</span>
          <span className="text-xs text-neutral-500 font-mono">{match.date}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm text-neutral-500 hidden sm:inline-block">
            {statType === 'goles' && marketLine !== 'btts' ? `(${match.home_goals}-${match.away_goals})` : ''}
          </span>
          <div 
            className={`w-14 py-1.5 flex items-center justify-center rounded text-sm font-bold font-mono shadow-sm transition-all duration-300
              ${isHit 
                ? 'bg-green-500/15 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:bg-green-500/25 group-hover:border-green-500/50' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/20 group-hover:border-red-500/40'
              }
            `}
          >
            {displayValue}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-neutral-100 p-4 md:p-8 font-sans selection:bg-green-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-neutral-800/80 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
              <span className="w-2 md:w-3 h-8 bg-green-500 inline-block shadow-[0_0_15px_rgba(34,197,94,0.4)]"></span>
              Escáner Comparativo
            </h1>
            <p className="text-neutral-400 mt-2 font-mono text-xs md:text-sm tracking-widest uppercase">
              // Head-to-Head Matchup &middot; +EV Analysis
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-500 bg-neutral-900 px-3 py-1.5 rounded-md border border-neutral-800">
            MODO: MOCK DATA (DISEÑO)
          </div>
        </header>

        {/* CONTROLES */}
        <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 bg-[#111113] p-4 md:p-5 rounded-xl border border-neutral-800 shadow-xl">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Métrica</label>
            <select
              value={statType}
              onChange={(e) => {
                setStatType(e.target.value);
                if (e.target.value === 'goles') setMarketLine('2.5');
                if (e.target.value === 'corners') setMarketLine('8.5');
                if (e.target.value === 'tarjetas') setMarketLine('3.5');
              }}
              className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full sm:w-56 p-2.5 outline-none font-medium transition-colors cursor-pointer hover:border-neutral-600"
            >
              <option value="goles">Goles Totales</option>
              <option value="corners">Córners Totales</option>
              <option value="tarjetas">Tarjetas Totales</option>
            </select>
          </div>

          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">Línea de Mercado</label>
            <select
              value={marketLine}
              onChange={(e) => setMarketLine(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block w-full sm:w-56 p-2.5 outline-none font-medium transition-colors cursor-pointer hover:border-neutral-600"
            >
              {statType === 'goles' && (
                <>
                  <option value="1.5">Over 1.5</option>
                  <option value="2.5">Over 2.5</option>
                  <option value="3.5">Over 3.5</option>
                  <option value="btts">Ambos Marcan (BTTS)</option>
                </>
              )}
              {statType === 'corners' && (
                <>
                  <option value="7.5">Over 7.5</option>
                  <option value="8.5">Over 8.5</option>
                  <option value="9.5">Over 9.5</option>
                  <option value="10.5">Over 10.5</option>
                </>
              )}
              {statType === 'tarjetas' && (
                <>
                  <option value="2.5">Over 2.5</option>
                  <option value="3.5">Over 3.5</option>
                  <option value="4.5">Over 4.5</option>
                  <option value="5.5">Over 5.5</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* LAYOUT SPLIT-SCREEN 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* COLUMNA EQUIPO 1 (LOCAL) */}
          <div className="bg-[#111113] rounded-xl border border-neutral-800/80 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-neutral-900/50 p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-lg shadow-inner">L</div>
                <h2 className="text-xl font-bold text-white tracking-tight">Manchester City</h2>
              </div>
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase tracking-widest bg-blue-900/20 border border-blue-800/50 px-2 py-1 rounded">Local</span>
            </div>
            <div className="p-3 flex-1">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex justify-between px-3 py-2 mb-1">
                <span>Últimos 5 Rivales</span>
                <span>{statType}</span>
              </div>
              <div className="flex flex-col gap-1">
                {mockDataHome.map(renderRow)}
              </div>
            </div>
          </div>

          {/* COLUMNA EQUIPO 2 (VISITANTE) */}
          <div className="bg-[#111113] rounded-xl border border-neutral-800/80 overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-neutral-900/50 p-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-600/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-lg shadow-inner">V</div>
                <h2 className="text-xl font-bold text-white tracking-tight">Real Madrid</h2>
              </div>
              <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-widest bg-orange-900/20 border border-orange-800/50 px-2 py-1 rounded">Visitante</span>
            </div>
            <div className="p-3 flex-1">
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex justify-between px-3 py-2 mb-1">
                <span>Últimos 5 Rivales</span>
                <span>{statType}</span>
              </div>
              <div className="flex flex-col gap-1">
                {mockDataAway.map(renderRow)}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const TABS = ['All', 'Recent Matches', 'Predictions', 'Player Stats', 'Referee Stats', 'Statistics', 'Odds'];

// --- EL CEREBRO MATEMÁTICO AVANZADO ---

function getStatValues(match: any, statType: string) {
  let homeVal = 0;
  let awayVal = 0;
  
  if (statType.includes('Goals') || statType === 'Match Result' || statType === 'Both Teams To Score') {
    homeVal = match.homeGoals; awayVal = match.awayGoals;
  } else if (statType.includes('Corners')) {
    homeVal = match.homeCorners; awayVal = match.awayCorners;
  } else if (statType.includes('Shots On Target')) {
    homeVal = match.homeShotsOnTarget; awayVal = match.awayShotsOnTarget;
  } else if (statType.includes('Shots')) {
    homeVal = match.homeShots; awayVal = match.awayShots;
  } else if (statType.includes('Fouls')) {
    homeVal = match.homeFouls; awayVal = match.awayFouls;
  } else if (statType.includes('Cards')) {
    homeVal = match.homeCards; awayVal = match.awayCards;
  } else if (statType.includes('Booking Points')) {
    homeVal = match.homeCards * 10 + match.homeRedCards * 15;
    awayVal = match.awayCards * 10 + match.awayRedCards * 15;
  }
  
  return { homeVal, awayVal };
}

function calculateMatchValue(match: any, statType: string) {
  const { homeVal, awayVal } = getStatValues(match, statType);
  const isHome = match.isHome;

  if (statType.includes('Total') || statType.startsWith('Match ')) {
    if (statType === 'Match Result') return isHome ? (homeVal - awayVal) : (awayVal - homeVal);
    return homeVal + awayVal;
  }
  if (statType === 'Both Teams To Score') {
    return (homeVal > 0 && awayVal > 0) ? 1 : 0;
  }
  if (statType.includes(' For')) {
    return isHome ? homeVal : awayVal;
  }
  if (statType.includes(' Against') || statType.includes(' Ag')) {
    return isHome ? awayVal : homeVal;
  }
  return homeVal + awayVal;
}

function evaluateHit(value: number, statType: string, market: string) {
  if (statType === 'Both Teams To Score') return market === 'Yes' ? value === 1 : value === 0;
  if (statType === 'Match Result') {
    if (market === 'Win') return value > 0;
    if (market === 'Draw') return value === 0;
    if (market === 'Loss') return value < 0;
  }
  
  const line = parseFloat(market.replace('Over ', '').replace('Under ', ''));
  if (market.includes('Over')) return value > line;
  if (market.includes('Under')) return value < line;
  return false;
}

function calculateMetrics(matches: any[], statType: string, market: string) {
  if (!matches || matches.length === 0) return { hitRate: 0, hits: 0, total: 0, avg: 0, currentStreak: 0 };

  const total = matches.length;
  let hits = 0;
  let sumValues = 0;
  let currentStreak = 0;
  let isStreakBroken = false;

  matches.forEach((match) => {
    const value = calculateMatchValue(match, statType);
    const isHit = evaluateHit(value, statType, market);

    if (isHit) hits++;
    if (statType !== 'Match Result' && statType !== 'Both Teams To Score') sumValues += value;

    if (isHit && !isStreakBroken) {
      currentStreak++;
    } else {
      isStreakBroken = true;
    }
  });

  return {
    hitRate: Math.round((hits / total) * 100),
    hits,
    total,
    avg: statType === 'Match Result' || statType === 'Both Teams To Score' ? '-' : (sumValues / total).toFixed(1),
    currentStreak
  };
}

export default function ComparisonPage() {
  const [activeTab, setActiveTab] = useState('Recent Matches');
  const [locationToggle, setLocationToggle] = useState('All matches');
  
  // Estados para Upcoming Fixtures (El "Cebo")
  const [upcomingDates, setUpcomingDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [upcomingFixtures, setUpcomingFixtures] = useState<any[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);

  // Estados para la conexión a Supabase (H2H)
  const [teams, setTeams] = useState<any[]>([]); 
  const [homeTeamId, setHomeTeamId] = useState<number | null>(null);
  const [awayTeamId, setAwayTeamId] = useState<number | null>(null);
  
  const [homeFixtures, setHomeFixtures] = useState<any[]>([]);
  const [awayFixtures, setAwayFixtures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de los selectores (Filtros Maestros)
  const [homeStatType, setHomeStatType] = useState('Total Match Goals');
  const [homeMarket, setHomeMarket] = useState('Over 2.5');
  const [awayStatType, setAwayStatType] = useState('Total Match Goals');
  const [awayMarket, setAwayMarket] = useState('Over 2.5');

  // --- 1. INICIALIZACIÓN ---
  useEffect(() => {
    const initData = async () => {
      const { data: dateData } = await supabase.from('fixtures').select('date').eq('status', 'NS').order('date', { ascending: true });
      if (dateData && dateData.length > 0) {
        const uniqueDates = Array.from(new Set(dateData.map(d => d.date.split('T')[0])));
        setUpcomingDates(uniqueDates as string[]);
        setSelectedDate(uniqueDates[0] as string);
      }
      const { data: teamData } = await supabase.from('teams').select('id, name');
      if (teamData) setTeams(teamData);
      setIsLoading(false);
    };
    initData();
  }, []);

  // --- 2. CAMBIO DE FECHA ---
  useEffect(() => {
    const fetchFixturesForDate = async () => {
      if (!selectedDate) return;
      const { data } = await supabase
        .from('fixtures')
        .select(`id, date, home_team_id, away_team_id, league_id, home_team:teams!fixtures_home_team_id_fkey(name), away_team:teams!fixtures_away_team_id_fkey(name)`)
        .eq('status', 'NS').gte('date', `${selectedDate}T00:00:00`).lte('date', `${selectedDate}T23:59:59`).order('date', { ascending: true });
      if (data && data.length > 0) {
        setUpcomingFixtures(data);
        setSelectedFixtureId(data[0].id);
      } else {
        setUpcomingFixtures([]);
        setSelectedFixtureId(null);
      }
    };
    fetchFixturesForDate();
  }, [selectedDate]);

  // --- 3. CAMBIO DE PARTIDO ---
  useEffect(() => {
    if (selectedFixtureId && upcomingFixtures.length > 0) {
      const fix = upcomingFixtures.find(f => f.id === selectedFixtureId);
      if (fix) {
        setHomeTeamId(fix.home_team_id);
        setAwayTeamId(fix.away_team_id);
      }
    }
  }, [selectedFixtureId, upcomingFixtures]);

  // --- 4. CARGA DE HISTORIAL PROFUNDO CON TODAS LAS ESTADÍSTICAS ---
  const fetchFixturesForTeam = async (teamId: number, setFixtures: (data: any) => void) => {
    const { data } = await supabase
      .from('fixtures')
      .select(`
        id, date, home_goals, away_goals, home_team_id, away_team_id,
        home_team:teams!fixtures_home_team_id_fkey(id, name),
        away_team:teams!fixtures_away_team_id_fkey(id, name),
        fixture_statistics(team_id, corners, yellow_cards, red_cards, total_shots, shots_on_target, fouls)
      `)
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq('status', 'FT')
      .order('date', { ascending: false })
      .limit(30); 
      
    if (data) {
      const mapped = data.map(f => {
        const isHome = f.home_team_id === teamId;
        const opponent = isHome ? (Array.isArray(f.away_team) ? f.away_team[0].name : (f.away_team as any)?.name) : (Array.isArray(f.home_team) ? f.home_team[0].name : (f.home_team as any)?.name);
        
        const homeStats = f.fixture_statistics.find((s: any) => s.team_id === f.home_team_id) || {};
        const awayStats = f.fixture_statistics.find((s: any) => s.team_id === f.away_team_id) || {};

        return {
          id: f.id,
          date: new Date(f.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          opponent: opponent || 'Unknown',
          homeGoals: f.home_goals || 0,
          awayGoals: f.away_goals || 0,
          homeCorners: homeStats.corners || 0,
          awayCorners: awayStats.corners || 0,
          homeCards: homeStats.yellow_cards || 0,
          awayCards: awayStats.yellow_cards || 0,
          homeRedCards: homeStats.red_cards || 0,
          awayRedCards: awayStats.red_cards || 0,
          homeShots: homeStats.total_shots || 0,
          awayShots: awayStats.total_shots || 0,
          homeShotsOnTarget: homeStats.shots_on_target || 0,
          awayShotsOnTarget: awayStats.shots_on_target || 0,
          homeFouls: homeStats.fouls || 0,
          awayFouls: awayStats.fouls || 0,
          isHome
        };
      });
      setFixtures(mapped);
    }
  };

  useEffect(() => { if (homeTeamId) fetchFixturesForTeam(homeTeamId, setHomeFixtures); }, [homeTeamId]);
  useEffect(() => { if (awayTeamId) fetchFixturesForTeam(awayTeamId, setAwayFixtures); }, [awayTeamId]);

  // --- FILTRO DE LOCALÍA ---
  const filteredHomeFixtures = useMemo(() => locationToggle === 'All matches' ? homeFixtures : homeFixtures.filter(m => m.isHome === true), [homeFixtures, locationToggle]);
  const filteredAwayFixtures = useMemo(() => locationToggle === 'All matches' ? awayFixtures : awayFixtures.filter(m => m.isHome === false), [awayFixtures, locationToggle]);

  const homeMetrics = useMemo(() => calculateMetrics(filteredHomeFixtures, homeStatType, homeMarket), [filteredHomeFixtures, homeStatType, homeMarket]);
  const awayMetrics = useMemo(() => calculateMetrics(filteredAwayFixtures, awayStatType, awayMarket), [filteredAwayFixtures, awayStatType, awayMarket]);

  const selectedHomeTeamObj = teams.find(t => t.id === homeTeamId);
  const selectedAwayTeamObj = teams.find(t => t.id === awayTeamId);
  const homeTeamName = selectedHomeTeamObj ? selectedHomeTeamObj.name : 'Home Team';
  const awayTeamName = selectedAwayTeamObj ? selectedAwayTeamObj.name : 'Away Team';

  const groupedFixtures = useMemo(() => {
    const groups: { [key: number]: any[] } = {};
    upcomingFixtures.forEach(f => {
      if (!groups[f.league_id]) groups[f.league_id] = [];
      groups[f.league_id].push(f);
    });
    return groups;
  }, [upcomingFixtures]);

  const getLeagueName = (leagueId: number) => {
    const map: {[key: number]: string} = { 39: 'Premier League', 140: 'La Liga', 78: 'Bundesliga', 135: 'Serie A', 61: 'Ligue 1' };
    return map[leagueId] || `League ${leagueId}`;
  };

  const getMarketOptions = (statType: string) => {
    if (statType === 'Match Result') return <><option>Win</option><option>Draw</option><option>Loss</option></>;
    if (statType === 'Both Teams To Score') return <><option>Yes</option><option>No</option></>;
    if (statType.includes('Corners')) return <><option>Over 7.5</option><option>Over 8.5</option><option>Over 9.5</option><option>Over 10.5</option></>;
    if (statType.includes('Shots') || statType.includes('Fouls')) return <><option>Over 10.5</option><option>Over 15.5</option><option>Over 20.5</option><option>Over 25.5</option></>;
    if (statType.includes('Booking Points')) return <><option>Over 25</option><option>Over 35</option><option>Over 45</option></>;
    return <><option>Over 0.5</option><option>Over 1.5</option><option>Over 2.5</option><option>Over 3.5</option></>;
  };

  const handleStatTypeChange = (val: string, setStatType: any, setMarket: any) => {
    setStatType(val);
    if (val === 'Match Result') setMarket('Win');
    else if (val === 'Both Teams To Score') setMarket('Yes');
    else if (val.includes('Corners')) setMarket('Over 8.5');
    else if (val.includes('Shots') || val.includes('Fouls')) setMarket('Over 20.5');
    else if (val.includes('Booking Points')) setMarket('Over 35');
    else setMarket('Over 2.5');
  };

  const renderTable = (data: any[], statType: string, setStatType: any, market: string, setMarket: any, teamName: string, metrics: any, isHomeColumn: boolean) => {
    const isHighValue = metrics.hitRate >= 70;
    const isModerateValue = metrics.hitRate >= 50 && metrics.hitRate < 70;
    
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-md overflow-hidden flex flex-col h-full">
        {/* FILTROS MAESTROS */}
        <div className={`border-b border-gray-200 px-4 py-3 flex flex-col gap-3 ${isHomeColumn ? 'bg-[#F0F7FF]' : 'bg-[#F0FDF4]'}`}>
          <div className="flex justify-between items-center">
            <h3 className={`font-bold text-lg ${isHomeColumn ? 'text-[#1E3A8A]' : 'text-[#064E3B]'}`}>{teamName} matches</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <select value={statType} onChange={(e) => handleStatTypeChange(e.target.value, setStatType, setMarket)} className="text-sm font-medium border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700 w-full focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm">
              <optgroup label="Goals">
                <option>Match Result</option>
                <option>Both Teams To Score</option>
                <option>Total Match Goals</option>
                <option>Team Goals For</option>
                <option>Team Goals Against</option>
              </optgroup>
              <optgroup label="Corners">
                <option>Total Match Corners</option>
                <option>Team Corners For</option>
                <option>Team Corners Against</option>
              </optgroup>
              <optgroup label="Shots & Fouls">
                <option>Total Match Shots</option>
                <option>Team Total Shots For</option>
                <option>Match Shots On Target</option>
                <option>Match Total Fouls</option>
              </optgroup>
              <optgroup label="Cards">
                <option>Total Booking Points</option>
                <option>Total Cards</option>
              </optgroup>
            </select>
            <select value={market} onChange={(e) => setMarket(e.target.value)} className="text-sm font-medium border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700 w-full focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer shadow-sm">
              {getMarketOptions(statType)}
            </select>
          </div>
        </div>

        {/* PANEL DE MÉTRICAS */}
        <div className={`px-4 py-4 flex items-center justify-between border-b ${metrics.total === 0 ? 'bg-gray-50' : isHighValue ? 'bg-[#10B981]/10' : isModerateValue ? 'bg-yellow-500/10' : 'bg-[#EF4444]/10'}`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Hit Rate</span>
            <span className={`text-3xl font-black ${metrics.total === 0 ? 'text-gray-400' : isHighValue ? 'text-[#10B981]' : isModerateValue ? 'text-yellow-600' : 'text-[#EF4444]'}`}>{metrics.hitRate}%</span>
            <span className="text-xs font-medium text-gray-600">{metrics.hits} out of {metrics.total} matches</span>
          </div>
          <div className="flex gap-6 text-right">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Average</span>
              <span className="text-xl font-bold text-gray-800">{metrics.avg}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Streak</span>
              <span className="text-xl font-bold text-gray-800">{metrics.currentStreak} {metrics.currentStreak > 2 && '🔥'}</span>
            </div>
          </div>
        </div>
        
        {/* LA CUADRÍCULA DE DATOS (Estilo Adamchoi Exacto) */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 font-bold w-24">Date</th>
                <th className="px-3 py-2 font-bold w-12 text-center">Comp</th>
                <th className="px-3 py-2 font-bold text-right w-1/3">Home Team</th>
                <th className="px-3 py-2 font-bold text-center w-20">Score</th>
                <th className="px-3 py-2 font-bold text-left w-1/3">Away Team</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 italic">No historical data available.</td></tr>
              ) : data.map((match) => {
                const valueForEvaluation = calculateMatchValue(match, statType);
                const isHit = evaluateHit(valueForEvaluation, statType, market);
                const { homeVal, awayVal } = getStatValues(match, statType);
                
                // Marcador Dinámico
                const dynamicScore = (statType === 'Match Result' || statType === 'Both Teams To Score') 
                  ? `${match.homeGoals} - ${match.awayGoals}` 
                  : `${homeVal} - ${awayVal}`;

                // El Factor Viciado (Tarjetas) Independiente del filtro
                const renderCards = (yellows: number, reds: number) => {
                  return (
                    <span className="inline-flex gap-0.5 align-middle mx-1">
                      {reds > 0 && <span className="w-2 h-3 bg-red-600 rounded-sm shadow-sm" title={`${reds} Red Card(s)`}></span>}
                      {yellows > 0 && <span className="w-2 h-3 bg-yellow-400 rounded-sm shadow-sm" title={`${yellows} Yellow Card(s)`}></span>}
                    </span>
                  );
                };

                return (
                  <tr key={match.id} className={`border-b-[3px] border-white transition-colors ${
                    isHit ? 'bg-[#10B981]/20 hover:bg-[#10B981]/30' : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25'
                  }`}>
                    <td className="px-3 py-2 text-gray-600 text-[11px] font-mono">{match.date}</td>
                    <td className="px-3 py-2 text-gray-400 font-bold text-[10px] uppercase text-center bg-black/5 rounded-sm">PL</td>
                    
                    {/* Equipo Local */}
                    <td className={`px-3 py-2 text-right font-medium text-xs ${match.isHome ? 'text-gray-900 font-black' : 'text-gray-600'}`}>
                      {match.isHome ? teamName : match.opponent}
                      {renderCards(match.homeCards, match.homeRedCards)}
                    </td>
                    
                    {/* Marcador Dinámico */}
                    <td className="px-1 py-2 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[3rem] px-1 py-1 rounded text-xs font-black shadow-sm border bg-white ${
                          isHit ? 'text-[#047857] border-[#10B981]/40' : 'text-[#B91C1C] border-[#EF4444]/40'
                        }`}>
                        {dynamicScore}
                      </span>
                    </td>
                    
                    {/* Equipo Visitante */}
                    <td className={`px-3 py-2 text-left font-medium text-xs ${!match.isHome ? 'text-gray-900 font-black' : 'text-gray-600'}`}>
                      {renderCards(match.awayCards, match.awayRedCards)}
                      {!match.isHome ? teamName : match.opponent}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-900 pb-12 selection:bg-blue-100">
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-[2] bg-[#F9FAFB] border border-gray-200 rounded-lg p-4 shadow-sm">
            <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">Select an Upcoming Fixture</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative min-w-[200px]">
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isLoading || upcomingDates.length === 0}>
                  {isLoading ? <option>Loading dates...</option> : upcomingDates.length === 0 ? <option>No upcoming matches</option> : upcomingDates.map(dateStr => {
                    const d = new Date(`${dateStr}T12:00:00`);
                    return <option key={dateStr} value={dateStr}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</option>;
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
              </div>
              <div className="flex-[2] relative">
                <select value={selectedFixtureId || ''} onChange={(e) => setSelectedFixtureId(Number(e.target.value))} className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm font-medium text-gray-700 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isLoading || upcomingFixtures.length === 0}>
                  {isLoading ? <option>Loading fixtures...</option> : upcomingFixtures.length === 0 ? <option>Select a date with fixtures...</option> : Object.entries(groupedFixtures).map(([leagueIdStr, fixtures]) => {
                    return (
                      <optgroup key={leagueIdStr} label={getLeagueName(Number(leagueIdStr))} className="font-bold text-gray-900 bg-gray-50">
                        {fixtures.map(f => {
                          const time = new Date(f.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                          return <option key={f.id} value={f.id} className="font-medium text-gray-700">{time} - {Array.isArray(f.home_team) ? f.home_team[0].name : f.home_team?.name} vs {Array.isArray(f.away_team) ? f.away_team[0].name : f.away_team?.name}</option>;
                        })}
                      </optgroup>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 border-dashed">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">Manual Override</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <select value={homeTeamId || ''} onChange={(e) => setHomeTeamId(Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-medium text-gray-500 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isLoading}>{isLoading ? <option>Loading...</option> : teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
              </div>
              <div className="flex-1 relative">
                <select value={awayTeamId || ''} onChange={(e) => setAwayTeamId(Number(e.target.value))} className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm font-medium text-gray-500 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" disabled={isLoading}>{isLoading ? <option>Loading...</option> : teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex space-x-2 min-w-max pt-1">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}>{tab}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">{homeTeamName} <span className="text-gray-400 font-normal mx-1">v</span> {awayTeamName}</h1>
          <div className="flex bg-gray-200/80 rounded p-1 border border-gray-200 shadow-inner">
            <button onClick={() => setLocationToggle('All matches')} className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-all ${locationToggle === 'All matches' ? 'bg-[#DC2626] text-white' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>All matches</button>
            <button onClick={() => setLocationToggle('Home/Away matches')} className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${locationToggle === 'Home/Away matches' ? 'bg-[#DC2626] text-white shadow-sm' : 'bg-transparent text-gray-500 hover:text-gray-700'}`}>Home/Away matches</button>
          </div>
        </div>

        {activeTab === 'Recent Matches' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {renderTable(filteredHomeFixtures, homeStatType, setHomeStatType, homeMarket, setHomeMarket, homeTeamName, homeMetrics, true)}
            {renderTable(filteredAwayFixtures, awayStatType, setAwayStatType, awayMarket, setAwayMarket, awayTeamName, awayMetrics, false)}
          </div>
        )}
        
        {activeTab !== 'Recent Matches' && (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center shadow-sm">
            <p className="text-gray-500 font-medium">Content for <span className="text-gray-800 font-bold">{activeTab}</span> will be implemented here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
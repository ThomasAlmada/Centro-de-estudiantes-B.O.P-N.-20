
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Role, User, NewsItem, VoteSession, VoteType, Moción, SystemLog, ArchivedResolution, SessionRecord } from './types';
import { INITIAL_USERS, INITIAL_NEWS } from './constants';
import { 
  Users, Vote, Calendar, Newspaper, LogOut, Menu, X, Mic2, FileText, AlertTriangle, 
  Landmark, Info, Send, Check, Archive, Clock, Home, Zap, ShieldCheck, UserPlus, Trash2, CheckCircle, XCircle, RefreshCcw,
  Cpu, Gavel, Scale, ChevronRight, RotateCcw
} from 'lucide-react';
import { geminiAssistant } from './geminiService';

const STATE_KEY = 'BOP20_SENADO_BROADCAST_V16';
const channel = new BroadcastChannel('bop20_senado_sync_channel');

const SYMBOLS = {
  escudoArg: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Coat_of_arms_of_Argentina.svg",
  escudoMis: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Escudo_de_la_Provincia_de_Misiones.svg/1042px-Escudo_de_la_Provincia_de_Misiones.svg.png",
  banderaArg: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_Argentina.svg/2560px-Flag_of_Argentina.svg.png",
  banderaMis: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Bandera_de_la_Provincia_de_Misiones.svg/1200px-Bandera_de_la_Provincia_de_Misiones.svg.png"
};

interface AppState {
  users: User[];
  news: NewsItem[];
  logs: SystemLog[];
  mociones: Moción[];
  historialResoluciones: ArchivedResolution[];
  historialSesiones: SessionRecord[];
  activeVote: VoteSession | null;
  sessionActive: boolean;
  cuartoIntermedio: boolean;
  speakerId: string | null;
  sessionStartTime: string | null;
}

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');

  const [appState, setAppState] = useState<AppState>(() => {
    const initialState: AppState = {
      users: INITIAL_USERS,
      news: INITIAL_NEWS,
      logs: [],
      mociones: [],
      historialResoluciones: [],
      historialSesiones: [],
      activeVote: null,
      sessionActive: false,
      cuartoIntermedio: false,
      speakerId: null,
      sessionStartTime: null
    };
    try {
      const saved = localStorage.getItem(STATE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return initialState;
  });

  useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      if (event.data) setAppState(prev => ({ ...prev, ...event.data }));
    };
    channel.addEventListener('message', handleSync);
    return () => channel.removeEventListener('message', handleSync);
  }, []);

  const dispatch = useCallback((updates: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setAppState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      localStorage.setItem(STATE_KEY, JSON.stringify(next));
      channel.postMessage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (currentUser) {
      const fresh = appState.users.find(u => u.id === currentUser.id);
      if (fresh) setCurrentUser(fresh);
    }
  }, [appState.users]);

  const addLog = useCallback((action: string) => {
    const newLog: SystemLog = { 
      id: Math.random().toString(36), 
      timestamp: new Date().toLocaleTimeString(), 
      usuario: currentUser?.nombre || 'SISTEMA', 
      accion: action,
      nivel: 'INFO'
    };
    dispatch(prev => ({ ...prev, logs: [newLog, ...(prev.logs || [])] }));
  }, [currentUser, dispatch]);

  const isAdmin = currentUser?.dni === '49993070';
  const isAuthority = currentUser && [Role.PRESIDENTE_TITULAR, Role.SECRETARIO_GENERAL_TITULAR].includes(currentUser.cargo);

  const activeSpeaker = useMemo(() => {
    return appState.users.find(u => u.pedirPalabra === 'CONCEDIDA');
  }, [appState.users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appState.users.find(u => u.dni === dniInput && dniInput === passInput && u.activo);
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
      addLog(`Autenticación de autoridad: ${user.nombre} ${user.apellido}`);
    } else {
      alert('ACCESO DENEGADO');
    }
  };

  const handleToggleSession = () => {
    if (appState.sessionActive) {
      dispatch(prev => ({ 
        ...prev, 
        sessionActive: false, 
        cuartoIntermedio: false,
        sessionStartTime: null, 
        activeVote: null,
        users: prev.users.map(u => ({ ...u, votoActual: null, pedirPalabra: 'NINGUNO' }))
      }));
      addLog('Sesión legislativa concluida por Presidencia.');
    } else {
      dispatch({ sessionActive: true, sessionStartTime: new Date().toLocaleTimeString() });
      addLog('Sesión ordinaria abierta.');
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-8">
        <div className="bg-white/95 backdrop-blur-xl p-16 shadow-[0_40px_100px_rgba(0,0,0,0.8)] w-full max-w-lg rounded-[40px] z-10 border-t-[12px] border-slate-900 border-b-[24px] border-red-700 text-center relative flex flex-col items-center">
           <div className="flex gap-10 mb-12">
             <img src={SYMBOLS.escudoArg} alt="Arg" className="h-20 drop-shadow-lg" />
             <img src={SYMBOLS.escudoMis} alt="Mis" className="h-20 drop-shadow-lg" />
           </div>
           <div className="space-y-2 mb-12">
              <h1 className="text-4xl font-black uppercase text-slate-950 tracking-tighter leading-none">Portal Legislativo</h1>
              <p className="text-[12px] font-bold text-blue-800 uppercase tracking-[0.4em] opacity-60">Puerto Esperanza • Misiones</p>
           </div>
           
           <form onSubmit={handleLogin} className="w-full space-y-6">
              <input type="text" placeholder="DOCUMENTO" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full bg-slate-100 p-6 font-black text-center rounded-[25px] outline-none focus:ring-4 ring-slate-200 transition-all text-2xl border-2 border-transparent focus:border-slate-300" />
              <input type="password" placeholder="CLAVE" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full bg-slate-100 p-6 font-black text-center rounded-[25px] outline-none focus:ring-4 ring-slate-200 transition-all text-2xl border-2 border-transparent focus:border-slate-300" />
              <button className="w-full bg-slate-950 text-white p-8 rounded-[30px] font-black uppercase text-sm tracking-[0.3em] hover:bg-red-700 shadow-2xl transition-all mt-6 active:scale-95">
                Acceder al Recinto
              </button>
           </form>
           <p className="mt-12 text-[9px] font-black text-slate-300 uppercase tracking-widest border-t pt-8 w-full">Sistema de Gestión Parlamentaria Estudiantil • 2025</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-['Inter'] overflow-hidden text-slate-900">
      {/* Sidebar - Moderno y Estilizado */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-[#0F172A] flex flex-col transition-all duration-500 shadow-2xl z-50`}>
        <div className="h-32 flex items-center justify-center border-b border-white/5 bg-black/20">
           {!isSidebarCollapsed ? (
             <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-red-700 rounded-2xl flex items-center justify-center text-white shadow-xl border-2 border-white/10">
                  <img src={SYMBOLS.escudoMis} className="w-10 h-10 object-contain" />
               </div>
               <div>
                  <h2 className="font-black text-white text-2xl tracking-tighter uppercase leading-none">BOP 20</h2>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest opacity-60">Centro de Estudiantes</p>
               </div>
             </div>
           ) : <img src={SYMBOLS.escudoMis} className="h-10" />}
        </div>
        
        <nav className="flex-1 py-10 px-6 space-y-2 overflow-y-auto custom-scrollbar">
           {[
            { id: 'home', label: 'Inicio', icon: <Home size={22}/>, roles: ['*'] },
            { id: 'news', label: 'Boletín Oficial', icon: <Newspaper size={22}/>, roles: ['*'] },
            { id: 'dashboard', label: 'Recinto Virtual', icon: <Landmark size={22}/>, roles: ['*'] },
            { id: 'voting', label: 'Tablero de Votos', icon: <Vote size={22}/>, roles: ['*'] },
            { id: 'mociones', label: 'Mociones', icon: <Info size={22}/>, roles: ['*'] },
            { id: 'attendance', label: 'Acreditación', icon: <Calendar size={22}/>, roles: [Role.PRESIDENTE_TITULAR, Role.SECRETARIO_GENERAL_TITULAR] },
            { id: 'users', label: 'Padrón', icon: <Users size={22}/>, roles: [Role.PRESIDENTE_TITULAR] },
            { id: 'historial', label: 'Archivo de Actas', icon: <Archive size={22}/>, roles: ['*'] },
            { id: 'ai', label: 'Gemini AI', icon: <Cpu size={22}/>, roles: [Role.PRESIDENTE_TITULAR, Role.SECRETARIA_PRENSA_TITULAR] },
           ].filter(item => item.roles.includes('*') || (currentUser && item.roles.includes(currentUser.cargo)) || isAdmin).map(item => (
             <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-6 p-5 rounded-[20px] transition-all group ${activeTab === item.id ? 'bg-white text-[#0F172A] shadow-2xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <div className={`${activeTab === item.id ? 'text-red-600' : 'group-hover:text-red-500'}`}>{item.icon}</div>
                {!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-[0.2em]">{item.label}</span>}
             </button>
           ))}
        </nav>

        <div className="p-8 bg-black/40 flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-white uppercase text-xl border border-white/10">{currentUser?.nombre[0]}</div>
           {!isSidebarCollapsed && (
             <div className="flex-1 truncate">
                <p className="text-sm font-black uppercase truncate text-white tracking-tight leading-none mb-1">{currentUser?.nombre}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{currentUser?.cargo}</p>
             </div>
           )}
           <button onClick={() => setIsLogged(false)} className="text-slate-500 hover:text-red-500 transition-colors"><LogOut size={22}/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Legislativo */}
        <header className="h-24 bg-white border-b border-slate-200 px-12 flex items-center justify-between z-40 shadow-sm relative">
           <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="flex-1 bg-[#75AADB]"></div>
              <div className="flex-1 bg-white"></div>
              <div className="flex-1 bg-[#75AADB]"></div>
           </div>
           
           <div className="flex items-center gap-8">
              <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                {isSidebarCollapsed ? <ChevronRight size={24}/> : <Menu size={24}/>}
              </button>
              <div className={`flex items-center gap-4 px-8 py-3 rounded-full border-2 text-[11px] font-black tracking-widest shadow-sm ${appState.sessionActive ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                 <div className={`w-3 h-3 rounded-full ${appState.sessionActive ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                 {appState.sessionActive ? 'SALA DE SESIONES ACTIVA' : 'RECESO LEGISLATIVO'}
              </div>

              {appState.sessionActive && activeSpeaker && (
                <div className="flex items-center gap-4 px-8 py-3 bg-[#0F172A] text-white rounded-full text-[11px] font-black tracking-widest shadow-lg animate-in slide-in-from-left duration-500 border-b-4 border-red-600">
                   <Mic2 size={16} className="text-red-500 animate-pulse"/>
                   EN EL USO DE LA PALABRA: <span className="uppercase text-slate-300">{activeSpeaker.nombre} {activeSpeaker.apellido}</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-8">
              <div className="hidden lg:flex items-center gap-3 mr-4">
                 <img src={SYMBOLS.banderaArg} className="h-8 w-12 object-cover rounded shadow-md" />
                 <img src={SYMBOLS.banderaMis} className="h-8 w-12 object-cover rounded shadow-md" />
              </div>
              {isAdmin && (
                <button onClick={handleToggleSession} className={`px-12 py-3.5 rounded-[20px] font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all ${appState.sessionActive ? 'bg-red-700 text-white hover:bg-red-800' : 'bg-[#0F172A] text-white hover:bg-black'}`}>
                   {appState.sessionActive ? 'Levantar Sesión' : 'Abrir Sesión'}
                </button>
              )}
           </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#F8FAFC]">
           <div className="animate-in fade-in duration-700">
             {activeTab === 'home' && <HomeModule user={currentUser!} appState={appState} />}
             {activeTab === 'news' && <NewsModule news={appState.news} isAdmin={isAdmin} dispatch={dispatch} />}
             {activeTab === 'dashboard' && <RecintoModule users={appState.users} currentUser={currentUser!} speakerId={appState.speakerId} dispatch={dispatch} isAdmin={isAdmin} />}
             {activeTab === 'voting' && <VotingModule activeVote={appState.activeVote} users={appState.users} currentUser={currentUser!} isAdmin={isAdmin} dispatch={dispatch} setActiveTab={setActiveTab} mociones={appState.mociones} />}
             {activeTab === 'attendance' && <AttendanceModule users={appState.users} dispatch={dispatch} isAdmin={isAdmin} />}
             {activeTab === 'users' && <UsersModule users={appState.users} dispatch={dispatch} />}
             {activeTab === 'mociones' && <MocionesModule mociones={appState.mociones} dispatch={dispatch} isAuthority={isAuthority} currentUser={currentUser!} />}
             {/* Fix: Corrected typo in appState property name from 'historialSessions' to 'historialSesiones' */}
             {activeTab === 'historial' && <HistoryModule resolutions={appState.historialResoluciones} sessions={appState.historialSesiones} />}
             {activeTab === 'ai' && <AiModule />}
           </div>
        </div>
      </main>
    </div>
  );
}

// --- SUBMÓDULOS DE VISTA ---

function HomeModule({ user, appState }: { user: User, appState: AppState }) {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32">
       <div className="bg-[#0F172A] text-white p-20 rounded-[60px] shadow-3xl border-b-[30px] border-red-700 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 group-hover:rotate-0 transition-all duration-[3s]"><img src={SYMBOLS.escudoArg} className="h-[600px]" /></div>
          <div className="relative z-10">
            <h2 className="text-8xl font-black uppercase tracking-tighter leading-[0.8] mb-10">Bienvenido, <br/> {user.nombre}</h2>
            <p className="text-red-500 font-black uppercase tracking-[1em] text-[12px] mb-16 opacity-80">Órgano de Gobierno Estudiantil • B.O.P. Nº 20</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 backdrop-blur-2xl">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest">Actado de Sesión</p>
                  <p className="text-3xl font-black tracking-tight">{appState.sessionActive ? 'ORDINARIA' : 'RECESO'}</p>
               </div>
               <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 backdrop-blur-2xl">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest">Acreditación</p>
                  <p className={`text-3xl font-black tracking-tight ${user.confirmado ? 'text-green-400' : 'text-yellow-400'}`}>{user.confirmado ? 'HABILITADO' : 'PENDIENTE'}</p>
               </div>
               <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 backdrop-blur-2xl">
                  <p className="text-[10px] font-black uppercase opacity-40 mb-3 tracking-widest">Dignidad / Cargo</p>
                  <p className="text-xl font-black truncate uppercase tracking-tighter">{user.cargo}</p>
               </div>
            </div>
          </div>
       </div>
       
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-slate-100 flex flex-col group">
             <h3 className="text-2xl font-black uppercase mb-10 flex items-center gap-6 tracking-tight">
                <div className="bg-red-700 p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform"><Zap size={24}/></div> Monitor Institucional
             </h3>
             <div className="space-y-4">
                {appState.logs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex gap-6 items-center p-6 bg-slate-50 rounded-[30px] border border-slate-100 hover:shadow-xl transition-all">
                     <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_15px_#ef4444]"></div>
                     <p className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">{log.accion}</p>
                     <span className="ml-auto text-[9px] font-black opacity-20 uppercase tracking-widest">{log.timestamp}</span>
                  </div>
                ))}
             </div>
          </div>
          <div className="bg-blue-800 text-white p-16 rounded-[50px] shadow-[0_40px_80px_rgba(30,58,138,0.3)] flex flex-col justify-between relative overflow-hidden group">
             <div className="absolute bottom-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-[4s]"><Scale size={300}/></div>
             <h3 className="text-2xl font-black uppercase mb-10 flex items-center gap-6 tracking-tight relative z-10"><ShieldCheck size={40}/> Transparencia</h3>
             <p className="text-4xl font-medium italic opacity-95 leading-[1.1] relative z-10 tracking-tight">"La voz de cada representante es el eco de su división. El sistema nominal garantiza la trazabilidad absoluta de la gestión estudiantil."</p>
             <div className="mt-20 pt-10 border-t border-white/20 text-[11px] font-black uppercase tracking-[0.8em] relative z-10">Puerto Esperanza • Misiones</div>
          </div>
       </div>
    </div>
  );
}

function NewsModule({ news, isAdmin, dispatch }: any) {
  const [t, setT] = useState('');
  const [c, setC] = useState('');
  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-32">
      {isAdmin && (
        <div className="bg-white p-16 rounded-[50px] shadow-2xl border border-slate-100 relative overflow-hidden">
           <h3 className="text-3xl font-black uppercase mb-12 tracking-tighter flex items-center gap-6"><FileText size={40} className="text-red-700"/> Nuevo Comunicado Oficial</h3>
           <div className="space-y-8">
              <input placeholder="CABECERA DEL COMUNICADO..." value={t} onChange={e => setT(e.target.value)} className="w-full p-8 bg-slate-50 border-2 rounded-[30px] font-black uppercase text-2xl outline-none focus:border-red-700 transition-all shadow-inner" />
              <textarea placeholder="CONTENIDO TÉCNICO..." value={c} onChange={e => setC(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[40px] text-2xl h-64 outline-none focus:border-red-700 transition-all shadow-inner leading-relaxed" />
              <button onClick={() => {
                if(!t || !c) return;
                const n = { id: Date.now().toString(), titulo: t, contenido: c, fecha: new Date().toLocaleDateString(), autor: 'Presidencia', categoria: 'OFICIAL' };
                dispatch((prev: any) => ({ ...prev, news: [n, ...(prev.news || [])] }));
                setT(''); setC('');
              }} className="bg-[#0F172A] text-white px-20 py-8 rounded-[35px] font-black uppercase text-xs tracking-[0.4em] shadow-3xl hover:bg-red-700 transition-all active:scale-95 border-b-[10px] border-black">Publicar Boletín Oficial</button>
           </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-12">
        {news.map((item: any) => (
          <div key={item.id} className="bg-white p-20 rounded-[80px] shadow-2xl border-l-[40px] border-[#0F172A] group hover:-translate-y-4 transition-all duration-700 relative overflow-hidden border border-slate-100">
             <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-10">
                  <span className="bg-red-50 text-red-800 px-10 py-3 rounded-full text-[12px] font-black tracking-[0.4em] uppercase border border-red-200 shadow-sm">{item.categoria}</span>
                  <span className="text-slate-400 text-[13px] font-black uppercase tracking-widest opacity-60">{item.fecha}</span>
                </div>
                {isAdmin && <button onClick={() => dispatch((prev: any) => ({ ...prev, news: prev.news.filter((n: any) => n.id !== item.id) }))} className="p-6 bg-slate-50 text-slate-300 hover:text-red-700 hover:bg-red-50 rounded-[30px] transition-all shadow-sm"><Trash2 size={32}/></button>}
             </div>
             <h3 className="text-7xl font-black uppercase mb-12 group-hover:text-red-700 transition-colors leading-[0.85] tracking-tighter">{item.titulo}</h3>
             <p className="text-slate-600 leading-relaxed font-medium text-4xl italic opacity-90 font-serif">"{item.contenido}"</p>
             <div className="mt-20 pt-12 border-t border-slate-100 flex items-center gap-8 text-[12px] font-black text-slate-400 uppercase tracking-[0.6em]">
                <Scale size={24} className="grayscale group-hover:grayscale-0 group-hover:text-blue-600 transition-all" /> 
                REFRENDADO POR LA AUTORIDAD: {item.autor}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecintoModule({ users, currentUser, speakerId, dispatch, isAdmin }: any) {
  const sortedMembers = useMemo(() => {
    return [...(users || [])]
      .filter(u => ![Role.PRESIDENTE_TITULAR, Role.PRESIDENTE_SUPLENTE].includes(u.cargo))
      .sort((a, b) => (a.cargo === Role.DELEGADO ? 1 : -1));
  }, [users]);

  return (
    <div className="bg-[#020617] p-16 rounded-[60px] shadow-[0_80px_150px_-40px_rgba(0,0,0,1)] relative min-h-[1000px] flex flex-col items-center justify-center overflow-hidden border-b-[40px] border-black border-t-8 border-white/5">
       <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <img src={SYMBOLS.escudoArg} className="h-[900px] blur-[2px]" />
       </div>

       {/* RECINTO LEGISLATIVO REAL - SEMICÍRCULOS CONCÉNTRICOS */}
       <div className="relative flex-1 w-full flex justify-center items-end pb-48 scale-110">
          {sortedMembers.map((u: any, i: number, arr: any) => {
             const rowsCount = 3;
             const seatsPerRow = Math.ceil(arr.length / rowsCount);
             const rowIndex = Math.floor(i / seatsPerRow);
             const posInRow = i % seatsPerRow;
             
             const radius = 450 + (rowIndex * 130);
             const angleRange = Math.PI * 0.9;
             const angle = (posInRow / (seatsPerRow - 1)) * angleRange + (Math.PI - angleRange) / 2;
             
             const x = Math.cos(angle) * radius;
             const y = -Math.sin(angle) * radius * 0.75;

             let seatStatus = 'bg-slate-800 border-slate-700 shadow-lg';
             if (u.confirmado) {
                if (u.votoActual === 'YES') seatStatus = 'bg-green-500 border-green-400 shadow-[0_0_20px_#22c55e] scale-110';
                else if (u.votoActual === 'NO') seatStatus = 'bg-red-500 border-red-400 shadow-[0_0_20px_#ef4444] scale-110';
                else if (u.votoActual === 'ABSTAIN') seatStatus = 'bg-blue-400 border-blue-300 shadow-[0_0_20px_#60a5fa] scale-110';
                else seatStatus = 'bg-slate-200 border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]';
             }

             return (
                <div key={u.id} style={{ transform: `translate(${x}px, ${y}px)` }} className={`absolute w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-[1s] group ${seatStatus} ${u.pedirPalabra === 'ESPERA' ? 'ring-[8px] ring-yellow-400 animate-pulse' : ''} ${speakerId === u.id ? 'ring-[20px] ring-blue-500 z-40 scale-125' : ''} cursor-help`}>
                   <span className="text-[10px] font-black text-black/20 select-none">{i+1}</span>
                   <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-white text-slate-950 p-6 rounded-[30px] opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-[0_40px_80px_rgba(0,0,0,0.8)] border-b-8 border-red-700 scale-75 group-hover:scale-100 origin-bottom">
                     <p className="text-sm font-black uppercase tracking-tight leading-none mb-1">{u.nombre} {u.apellido}</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{u.cargo}</p>
                   </div>
                </div>
             );
          })}
          
          <div className="w-[600px] h-64 bg-white border-b-[30px] border-red-700 rounded-t-[180px] flex flex-col items-center justify-center text-slate-950 shadow-[0_80px_150px_rgba(0,0,0,1)] relative z-20 border-t-8 border-slate-100">
             <img src={SYMBOLS.escudoMis} className="h-24 mb-6 drop-shadow-lg" />
             <span className="text-xl font-black uppercase tracking-[1.5em] opacity-40 leading-none">Mesa de Presidencia</span>
             <div className="flex gap-10 mt-10 opacity-30">
               <img src={SYMBOLS.banderaArg} className="h-4 rounded-sm shadow-sm" />
               <img src={SYMBOLS.banderaMis} className="h-4 rounded-sm shadow-sm" />
             </div>
          </div>
       </div>

       {currentUser?.confirmado && (
         <div className="flex flex-col items-center gap-12 pb-32 relative z-30">
           {currentUser.pedirPalabra === 'CONCEDIDA' && (
              <div className="bg-blue-600 text-white px-24 py-8 rounded-full font-black uppercase text-base tracking-[0.5em] animate-pulse shadow-[0_0_80px_rgba(37,99,235,0.6)] border-4 border-white/20 flex items-center gap-8">
                 <Mic2 size={40} className="stroke-[3]"/> ESTÁ EN EL USO DE LA PALABRA
              </div>
           )}
           <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((u: any) => u.id === currentUser.id ? { ...u, pedirPalabra: u.pedirPalabra === 'NINGUNO' ? 'ESPERA' : 'NINGUNO' } : u) }))} className={`px-48 py-14 rounded-[100px] font-black uppercase text-5xl shadow-[0_60px_120px_-30px_rgba(0,0,0,1)] transition-all border-b-[25px] transform active:scale-95 active:translate-y-6 ${currentUser.pedirPalabra === 'ESPERA' ? 'bg-yellow-500 border-yellow-700 text-white' : 'bg-white border-slate-300 text-slate-900 hover:bg-red-700 hover:text-white hover:border-red-900'}`}>
              {currentUser.pedirPalabra === 'ESPERA' ? 'Anular Pedido' : 'Solicitar la Palabra'}
           </button>
         </div>
       )}
    </div>
  );
}

function VotingModule({ activeVote, users, currentUser, isAdmin, dispatch, setActiveTab, mociones }: any) {
  const stats = useMemo(() => {
    const s = { YES: 0, NO: 0, ABS: 0, TOTAL: 0 };
    users.filter((u: any) => u.confirmado).forEach((u: any) => {
       if (u.votoActual === 'YES') s.YES++;
       else if (u.votoActual === 'NO') s.NO++;
       else if (u.votoActual === 'ABSTAIN') s.ABS++;
       if (u.votoActual) s.TOTAL++;
    });
    return s;
  }, [users]);

  const totalCuerpo = users.filter((u: any) => u.confirmado).length;

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-48 flex justify-center">
       {activeVote ? (
         <div className="bg-[#020617] w-full max-w-[1280px] aspect-[16/9] rounded-[40px] shadow-[0_80px_200px_-50px_rgba(0,0,0,1)] overflow-hidden border-[15px] border-black flex flex-col relative animate-in zoom-in duration-1000">
            {/* MARCO BROADCAST TV LEGISLATIVA */}
            <div className="bg-[#0F172A]/80 backdrop-blur-xl p-12 flex justify-between items-center border-b border-white/5">
               <div className="flex gap-10 items-center">
                  <div className="bg-white p-5 rounded-2xl shadow-2xl border-t-8 border-slate-200"><img src={SYMBOLS.escudoArg} className="h-20" /></div>
                  <div className="space-y-1">
                    <p className="text-white font-black text-4xl tracking-tighter leading-none uppercase">EXPEDIENTE {activeVote.resolucionNro}</p>
                    <p className="text-blue-500 font-bold text-xs uppercase tracking-[0.4em]">{activeVote.asunto}</p>
                    <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mt-2">ORDEN DEL DÍA • SESIÓN EXTRAORDINARIA</p>
                  </div>
               </div>
               
               <div className="flex gap-16 items-center">
                  <div className="text-right">
                    <p className="text-[140px] font-black leading-none text-green-500 tracking-tighter drop-shadow-[0_0_30px_rgba(34,197,94,0.3)] uppercase">Afirmativo</p>
                  </div>
                  <div className="grid grid-cols-3 gap-12 border-l border-white/10 pl-16">
                    <div className="text-center"><p className="text-8xl font-black text-green-500 leading-none">{stats.YES}</p><p className="text-[11px] font-black text-green-500/60 uppercase tracking-widest mt-4">SÍ</p></div>
                    <div className="text-center"><p className="text-8xl font-black text-red-500 leading-none">{stats.NO}</p><p className="text-[11px] font-black text-red-500/60 uppercase tracking-widest mt-4">NO</p></div>
                    <div className="text-center"><p className="text-8xl font-black text-blue-400 leading-none">{stats.ABS}</p><p className="text-[11px] font-black text-blue-400/60 uppercase tracking-widest mt-4">ABS</p></div>
                  </div>
               </div>
            </div>

            {/* VISTA DEL RECINTO EN TIEMPO REAL */}
            <div className="flex-1 flex flex-col items-center justify-center p-20 relative">
               <div className="relative w-[1000px] h-[450px] flex justify-center items-end border-b-2 border-white/5 pb-16 scale-110">
                  {users.filter(u => u.confirmado).map((u: any, i: number, arr: any) => {
                     const rCount = 4;
                     const sPerRow = Math.ceil(arr.length / rCount);
                     const r = Math.floor(i / sPerRow);
                     const rad = 250 + (r * 65);
                     const ang = ((i % sPerRow) / (sPerRow - 1)) * Math.PI;
                     const x = Math.cos(ang) * rad;
                     const y = -Math.sin(ang) * rad * 0.65;
                     
                     let color = 'bg-slate-800 shadow-inner';
                     if (u.votoActual === 'YES') color = 'bg-green-500 shadow-[0_0_15px_#22C55E] ring-2 ring-white/20';
                     else if (u.votoActual === 'NO') color = 'bg-red-500 shadow-[0_0_15px_#EF4444] ring-2 ring-white/20';
                     else if (u.votoActual === 'ABSTAIN') color = 'bg-blue-400 shadow-[0_0_15px_#60A5FA] ring-2 ring-white/20';

                     return <div key={u.id} style={{ transform: `translate(${x}px, ${y}px)` }} className={`absolute w-4 h-4 rounded-full transition-all duration-[2s] ${color}`} />;
                  })}
                  <img src={SYMBOLS.escudoMis} className="h-16 opacity-30 mb-4" />
               </div>

               {/* PANEL DE VOTO - ESTILO TV INTERACTIVA */}
               {!currentUser.votoActual && currentUser.confirmado && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl z-50 flex items-center justify-center p-20">
                     <div className="bg-white p-20 rounded-[80px] shadow-3xl w-full max-w-4xl text-center border-b-[25px] border-slate-950 animate-in slide-in-from-bottom duration-1000">
                        <img src={SYMBOLS.escudoArg} className="h-24 mx-auto mb-12 opacity-40" />
                        <h3 className="text-5xl font-black uppercase text-slate-950 mb-16 tracking-tighter">Emita su Sufragio Nominal</h3>
                        <div className="flex gap-10">
                           <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((u: any) => u.id === currentUser.id ? {...u, votoActual: 'YES'} : u) }))} className="flex-1 bg-green-600 text-white py-14 rounded-[40px] text-7xl font-black shadow-2xl hover:scale-105 active:translate-y-6 transition-all border-b-[20px] border-green-800">SÍ</button>
                           <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((u: any) => u.id === currentUser.id ? {...u, votoActual: 'NO'} : u) }))} className="flex-1 bg-red-600 text-white py-14 rounded-[40px] text-7xl font-black shadow-2xl hover:scale-105 active:translate-y-6 transition-all border-b-[20px] border-red-800">NO</button>
                           <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((u: any) => u.id === currentUser.id ? {...u, votoActual: 'ABSTAIN'} : u) }))} className="flex-1 bg-blue-500 text-white py-14 rounded-[40px] text-5xl font-black shadow-2xl hover:scale-105 active:translate-y-6 transition-all border-b-[20px] border-blue-700">ABS</button>
                        </div>
                        <p className="mt-20 text-[10px] font-black text-slate-300 uppercase tracking-[1.5em]">Su voto es público y se registrará nominalmente en el acta</p>
                     </div>
                  </div>
               )}

               {currentUser.votoActual && (
                  <div className="mt-16 bg-white/5 p-12 rounded-[50px] text-center border border-white/10 animate-in zoom-in duration-1000 flex flex-col items-center">
                     <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-8 border-2 border-green-500/30">
                        <Check size={48} strokeWidth={4} />
                     </div>
                     <h3 className="text-4xl font-black uppercase text-white mb-4 tracking-tighter leading-none">Voto Confirmado</h3>
                     <p className="text-slate-400 text-xl font-light italic max-w-xl leading-snug">Su voluntad soberana ha sido consolidada en el acta. El sufragio nominal es irreversible una vez registrado en el tablero electrónico.</p>
                  </div>
               )}
            </div>

            {/* BARRA DE ESTADO BROADCAST */}
            <div className="bg-[#020617] h-28 px-16 flex justify-between items-center mt-auto border-t border-white/5">
               <div className="flex items-center gap-10">
                  <div className="bg-white p-4 rounded-xl shadow-2xl"><img src={SYMBOLS.escudoArg} className="h-12" /></div>
                  <div className="space-y-1">
                    <h5 className="text-white font-black text-4xl tracking-tighter uppercase leading-none">Votación en General</h5>
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.5em]">CENTRO DE ESTUDIANTES BOP 20 • PUERTO ESPERANZA • MISIONES</p>
                  </div>
               </div>
               <div className="flex gap-12 items-center text-right">
                  <div className="bg-white/5 px-10 py-4 rounded-3xl border border-white/5">
                    <p className="text-white text-4xl font-black leading-none">{stats.TOTAL} / {totalCuerpo}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">SUFRAGANTES</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white text-4xl font-black leading-none">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">SGP BROADCAST LIVE</p>
                  </div>
               </div>
            </div>

            {/* CONTROLES DE PRESIDENCIA - FLOTANTES */}
            {isAdmin && (
               <div className="absolute bottom-40 left-1/2 -translate-x-1/2 flex gap-6 animate-in slide-in-from-bottom duration-1000">
                  <button onClick={() => { if(confirm('¿Reiniciar la votación actual por error de carga?')) dispatch((prev: any) => ({ ...prev, users: prev.users.map(u => ({ ...u, votoActual: null })) })) }} className="bg-[#0F172A]/90 backdrop-blur-xl text-white px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-widest border-2 border-red-700/50 hover:bg-red-700 transition-all flex items-center gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                    <RotateCcw size={20}/> Reiniciar Escrutinio
                  </button>
                  <button onClick={() => {
                     const res = stats.YES >= stats.NO ? 'APROBADA' : 'RECHAZADA';
                     const votantes = users.filter((u: any) => u.confirmado && u.votoActual).map((u: any) => ({ nombreCompleto: `${u.nombre} ${u.apellido}`, voto: u.votoActual }));
                     const str = votantes.map((v: any) => `${v.nombreCompleto} (${v.voto === 'YES' ? 'AFIRMATIVO' : v.voto === 'NO' ? 'NEGATIVO' : 'ABSTENCIÓN'})`).join(", ");
                     const actaText = `“Puesta a consideración la moción correspondiente al Orden del Día, la misma fue sometida a votación nominal y resultó ${res.toLowerCase()} por voluntad mayoritaria del cuerpo. Sufragantes: ${str}.”`;
                     
                     dispatch((prev: any) => ({ 
                        ...prev, 
                        activeVote: null, 
                        users: prev.users.map((u: any) => ({ ...u, votoActual: null })),
                        historialResoluciones: [{ id: Date.now().toString(), asunto: activeVote.asunto, fecha: new Date().toLocaleDateString(), resultado: res, textoLegal: actaText, votosDetalle: votantes }, ...(prev.historialResoluciones || [])],
                        mociones: activeVote.mociónId ? prev.mociones.filter((m: any) => m.id !== activeVote.mociónId) : prev.mociones
                     }));
                     setActiveTab('historial');
                  }} className="bg-green-600 text-white px-16 py-5 rounded-full font-black text-[11px] uppercase tracking-widest shadow-[0_20px_60px_rgba(22,163,74,0.4)] hover:scale-105 active:translate-y-3 transition-all border-b-8 border-green-800">Consolidar Acta y Cerrar</button>
               </div>
            )}
         </div>
       ) : (
         <div className="text-center py-64 animate-in fade-in duration-[1.5s] w-full max-w-5xl bg-white rounded-[80px] shadow-3xl border-4 border-slate-100 flex flex-col items-center">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10 border border-slate-100 shadow-inner">
               <Gavel size={64} className="text-slate-200 stroke-[1.5]"/>
            </div>
            <h3 className="text-7xl font-black uppercase text-slate-950 mb-8 tracking-tighter leading-none">Sistema en Reposo</h3>
            <p className="text-4xl font-medium italic text-slate-400 max-w-2xl leading-tight uppercase tracking-widest opacity-60">
               "El tablero de votación nominal se encuentra inactivo. A la espera de instrucciones de la presidencia."
            </p>
            <div className="mt-20 flex gap-12 opacity-20">
               <img src={SYMBOLS.banderaArg} className="h-8 shadow-md" />
               <img src={SYMBOLS.banderaMis} className="h-8 shadow-md" />
            </div>
         </div>
       )}
    </div>
  );
}

function AttendanceModule({ users, dispatch, isAdmin }: any) {
  const presentCount = users.filter((u: any) => u.confirmado).length;
  const total = users.length;
  const hasQuorum = presentCount >= total / 2;

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-32">
       <div className="bg-white p-20 rounded-[80px] shadow-3xl flex justify-between items-center relative overflow-hidden border-b-[35px] border-slate-950">
          <div className="flex items-center gap-16 relative z-10">
            <div className="p-8 bg-[#0F172A] rounded-[40px] shadow-2xl border-t-8 border-slate-700"><img src={SYMBOLS.escudoArg} className="h-32" /></div>
            <div>
              <h3 className="text-9xl font-black uppercase tracking-tighter text-slate-950 mb-4 leading-[0.75]">Acreditación</h3>
              <p className={`text-4xl font-black uppercase tracking-[0.4em] transition-colors duration-1000 ${hasQuorum ? 'text-green-600' : 'text-red-700'}`}>
                 {hasQuorum ? 'QUÓRUM LEGAL ALCANZADO' : 'FALTA DE QUÓRUM'}
              </p>
            </div>
          </div>
          <div className="text-right relative z-10">
             <div className="flex items-baseline gap-6 mb-4">
                <span className={`text-[220px] font-black leading-none transition-all duration-1000 ${hasQuorum ? 'text-green-600' : 'text-red-700'}`}>{presentCount}</span>
                <span className="text-8xl font-black text-slate-100">/ {total}</span>
             </div>
             <div className="w-[500px] h-4 bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                <div className={`h-full transition-all duration-[2s] ${hasQuorum ? 'bg-green-600' : 'bg-red-700'}`} style={{ width: `${(presentCount/total)*100}%` }}></div>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {users.map((u: any) => (
             <div key={u.id} className={`p-12 rounded-[60px] border-[10px] shadow-3xl transition-all duration-700 flex flex-col items-center text-center group ${u.confirmado ? 'bg-white border-green-500 scale-105' : 'bg-slate-50 border-white opacity-40 grayscale hover:grayscale-0'}`}>
                <div className={`w-32 h-32 rounded-[45px] mb-12 flex items-center justify-center text-7xl font-black transition-all group-hover:scale-110 ${u.confirmado ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-700'}`}>
                   {u.confirmado ? <Check size={80} strokeWidth={4}/> : u.nombre[0]}
                </div>
                <p className="font-black uppercase text-slate-950 text-4xl leading-none mb-3 tracking-tighter">{u.nombre}</p>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-16 h-12 flex items-center justify-center text-center leading-tight">{u.cargo}</p>
                {isAdmin && (
                   <div className="flex gap-6 w-full mt-auto">
                      <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((usr: any) => usr.id === u.id ? { ...usr, confirmado: true } : usr) }))} className="flex-1 py-7 rounded-[35px] bg-green-600 text-white font-black text-[12px] uppercase shadow-2xl hover:bg-green-700 active:scale-95 transition-all border-b-8 border-green-800">Presente</button>
                      <button onClick={() => dispatch((prev: any) => ({ ...prev, users: prev.users.map((usr: any) => usr.id === u.id ? { ...usr, confirmado: false } : usr) }))} className="flex-1 py-7 rounded-[35px] bg-red-600 text-white font-black text-[12px] uppercase shadow-2xl hover:bg-red-700 active:scale-95 transition-all border-b-8 border-red-800">Ausente</button>
                   </div>
                )}
             </div>
          ))}
       </div>
    </div>
  );
}

function HistoryModule({ resolutions }: any) {
  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-48">
       <div className="bg-white p-20 rounded-[80px] shadow-3xl border-b-[35px] border-[#0F172A] flex justify-between items-center relative overflow-hidden border border-slate-50">
          <div className="absolute top-0 left-0 p-20 opacity-[0.03] -rotate-12 scale-150"><Landmark size={400} /></div>
          <div><h3 className="text-9xl font-black uppercase tracking-tighter mb-4 text-slate-950 leading-[0.7]">Archivo</h3><p className="text-3xl font-black text-slate-300 uppercase tracking-[0.6em] italic leading-none">REGISTRO DE RESOLUCIONES</p></div>
          <Archive size={150} className="text-slate-100 z-10 stroke-[1] text-red-700" />
       </div>

       <div className="space-y-16">
          <h4 className="text-5xl font-black uppercase text-slate-900 flex items-center gap-12 leading-none tracking-tighter border-b-8 border-slate-100 pb-12"><FileText size={72} className="text-red-700"/> Resoluciones Consolidadas</h4>
          {resolutions?.map((r: any) => (
             <div key={r.id} className="bg-white p-20 rounded-[80px] shadow-3xl border relative overflow-hidden animate-in slide-in-from-left duration-1000 border-b-[25px] border-slate-50 group hover:-translate-y-4 transition-all">
                <div className={`absolute left-0 top-0 h-full w-8 ${r.resultado === 'APROBADA' ? 'bg-green-600' : 'bg-red-700'}`}></div>
                <div className="flex justify-between items-center mb-16">
                   <span className={`px-16 py-5 rounded-full font-black uppercase text-base tracking-[0.4em] shadow-xl ${r.resultado === 'APROBADA' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>{r.resultado}</span>
                   <span className="text-slate-300 font-black text-3xl uppercase tracking-widest opacity-40">{r.fecha}</span>
                </div>
                <h4 className="text-7xl font-black uppercase mb-16 text-slate-950 leading-[0.8] tracking-tighter group-hover:text-red-700 transition-colors">{r.asunto}</h4>
                <div className="bg-slate-50 p-20 rounded-[80px] italic text-4xl text-slate-600 border border-slate-100 leading-snug font-serif shadow-inner border-t-[20px] border-slate-200">
                  "{r.textoLegal}"
                </div>
             </div>
          ))}
          {(!resolutions || resolutions.length === 0) && <p className="text-center py-40 text-slate-200 font-black uppercase text-5xl tracking-[1em] opacity-30 leading-none">ARCHIVO<br/>VACÍO</p>}
       </div>
    </div>
  );
}

function UsersModule({ users, dispatch }: any) {
  const [n, setN] = useState('');
  const [a, setA] = useState('');
  const [d, setD] = useState('');
  const [c, setC] = useState('');
  const [e, setE] = useState('');
  const [t, setT] = useState('');
  const [r, setR] = useState(Role.DELEGADO);
  
  return (
    <div className="max-w-7xl mx-auto space-y-24 pb-48">
       <div className="bg-white p-24 rounded-[100px] shadow-3xl border border-slate-100 relative overflow-hidden border-b-[35px] border-[#0F172A]">
          <h3 className="text-7xl font-black uppercase mb-20 border-l-[40px] border-red-700 pl-16 leading-none tracking-tighter relative z-10">Padrón de Ciudadanos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">Nombres</label><input value={n} onChange={e => setN(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black uppercase text-2xl shadow-inner border-transparent focus:border-red-700 outline-none" /></div>
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">Apellidos</label><input value={a} onChange={e => setA(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black uppercase text-2xl shadow-inner border-transparent focus:border-red-700 outline-none" /></div>
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">DNI</label><input value={d} onChange={e => setD(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black text-center text-2xl shadow-inner border-transparent focus:border-red-700 outline-none" /></div>
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">Email</label><input value={e} onChange={e => setE(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black text-2xl shadow-inner border-transparent focus:border-red-700 outline-none lowercase" /></div>
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">Teléfono</label><input value={t} onChange={e => setT(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black text-2xl shadow-inner border-transparent focus:border-red-700 outline-none" /></div>
             <div className="space-y-4"><label className="text-[12px] font-black uppercase text-slate-400 ml-10 tracking-[0.5em]">Curso</label><input value={c} onChange={e => setC(e.target.value)} className="w-full p-10 bg-slate-50 border-2 rounded-[60px] font-black uppercase text-2xl shadow-inner border-transparent focus:border-red-700 outline-none" /></div>
             <div className="col-span-full space-y-4"><label className="text-[13px] font-black uppercase text-slate-300 ml-12 tracking-[1em]">Cargo en el Recinto</label><select value={r} onChange={e => setR(e.target.value as any)} className="w-full p-12 bg-[#0F172A] text-white rounded-[70px] font-black uppercase text-2xl shadow-2xl appearance-none cursor-pointer border-x-[20px] border-[#0F172A] focus:border-red-700 transition-all">
                {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
             </select></div>
          </div>
          <button onClick={() => {
               if(!n || !d || !c) return;
               const newUser = { id: Date.now().toString(), dni: d, nombre: n, apellido: a, email: e, telefono: t, cargo: r, curso: c, confirmado: false, votoActual: null, pedirPalabra: 'NINGUNO', activo: true, banca: users.length + 1 };
               dispatch((prev: any) => ({ ...prev, users: [...prev.users, newUser] }));
               setN(''); setA(''); setD(''); setC(''); setE(''); setT('');
            }} className="mt-20 bg-[#0F172A] text-white px-32 py-10 rounded-[60px] font-black uppercase text-lg tracking-[0.6em] shadow-[0_40px_80px_rgba(0,0,0,0.5)] hover:bg-red-700 transition-all flex items-center gap-10 border-b-[20px] border-black active:border-b-0 active:translate-y-6">
              <UserPlus size={40} className="stroke-[3]"/> Registrar Representante
            </button>
       </div>

       <div className="space-y-12">
          {users.map((u: any) => (
             <div key={u.id} className="bg-white p-12 rounded-[100px] shadow-3xl border border-slate-100 flex items-center gap-12 group hover:bg-[#0F172A] transition-all duration-[0.8s] relative overflow-hidden border-b-[20px] border-slate-50">
                <div className="w-32 h-32 bg-slate-50 rounded-[45px] flex items-center justify-center font-black text-6xl text-slate-950 shadow-inner group-hover:bg-white transition-colors">{u.nombre[0]}</div>
                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-10">
                      <h4 className="text-6xl font-black uppercase tracking-tighter text-slate-950 group-hover:text-white transition-colors leading-none">{u.nombre} {u.apellido}</h4>
                      <div className="px-10 py-3 bg-red-700 text-white rounded-full text-sm font-black uppercase tracking-widest shadow-xl">{u.cargo}</div>
                   </div>
                   <div className="flex gap-16 ml-2">
                      <div className="space-y-1"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Documento</p><p className="font-black text-slate-400 text-2xl tracking-tighter leading-none">{u.dni}</p></div>
                      <div className="space-y-1"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">E-Mail</p><p className="font-bold text-slate-400 text-xl tracking-tight leading-none group-hover:text-slate-200 transition-colors opacity-60 truncate max-w-[200px]">{u.email}</p></div>
                      <div className="space-y-1"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Contacto</p><p className="font-black text-slate-700 text-2xl tracking-tighter leading-none group-hover:text-red-500 transition-colors">{u.telefono}</p></div>
                      <div className="space-y-1"><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">División</p><p className="font-black text-blue-700 text-2xl tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{u.curso}</p></div>
                   </div>
                </div>
                <div className="flex gap-4 pr-10">
                   <button onClick={() => { if(confirm('¿Baja definitiva?')) dispatch((prev: any) => ({ ...prev, users: prev.users.filter((usr: any) => usr.id !== u.id) })); }} className="p-10 bg-slate-50 rounded-[45px] text-slate-300 hover:bg-red-700 hover:text-white transition-all shadow-xl active:scale-90 group-hover:bg-slate-900 group-hover:border group-hover:border-white/10"><Trash2 size={40}/></button>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function MocionesModule({ mociones, dispatch, isAuthority, currentUser }: any) {
  const [t, setT] = useState('');
  const [d, setD] = useState('');
  const pendientes = mociones.filter((m: any) => m.estado === 'PENDIENTE' || m.estado === 'DEBATE');

  return (
    <div className="max-w-7xl mx-auto space-y-24 pb-48">
       <div className="bg-white p-24 rounded-[120px] shadow-3xl border-l-[50px] border-blue-700 relative overflow-hidden group border-b-[20px] border-slate-50">
          <div className="absolute top-0 right-0 p-20 opacity-5 group-hover:scale-125 transition-transform duration-[3s]"><Scale size={400}/></div>
          <h3 className="text-[120px] font-black uppercase mb-16 tracking-tighter leading-[0.7] relative z-10">Nueva Moción</h3>
          <div className="space-y-12 relative z-10 max-w-5xl">
             <div className="space-y-4">
                <label className="text-[13px] font-black uppercase text-slate-300 ml-12 tracking-[0.6em]">Título del Asunto Parlamentario</label>
                <input placeholder="NOMBRE DEL PROYECTO..." value={t} onChange={e => setT(e.target.value)} className="w-full p-12 bg-slate-50 border-2 rounded-[60px] font-black uppercase text-4xl outline-none focus:border-blue-700 transition-all shadow-inner border-transparent" />
             </div>
             <div className="space-y-4">
                <label className="text-[13px] font-black uppercase text-slate-300 ml-12 tracking-[0.6em]">Fundamentación de la Moción</label>
                <textarea placeholder="DESCRIPCIÓN Y JUSTIFICACIÓN..." value={d} onChange={e => setD(e.target.value)} className="w-full p-12 bg-slate-50 border-2 rounded-[80px] font-medium h-80 text-4xl outline-none focus:border-blue-700 transition-all leading-tight shadow-inner border-transparent" />
             </div>
             <button onClick={() => {
                if(!t || !d) return;
                const m = { id: Date.now().toString(), titulo: t, descripcion: d, proponente: currentUser.nombre, estado: 'PENDIENTE', fecha: new Date().toLocaleDateString() };
                dispatch((prev: any) => ({ ...prev, mociones: [m, ...(prev.mociones || [])] }));
                setT(''); setD('');
             }} className="bg-blue-700 text-white px-40 py-12 rounded-[80px] font-black uppercase text-xl tracking-[0.6em] shadow-[0_30px_60px_rgba(30,64,175,0.4)] hover:bg-[#0F172A] transition-all flex items-center justify-center gap-10 border-b-[20px] border-blue-950 active:border-b-0 active:translate-y-6">
               <Send size={48} className="stroke-[3]"/> Elevar Proyecto
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          {pendientes.map((m: any) => (
             <div key={m.id} className="p-24 rounded-[120px] border-[12px] shadow-3xl bg-white border-slate-50 hover:-translate-y-8 transition-all duration-1000 relative group overflow-hidden border-b-[30px]">
                <div className="flex justify-between items-start mb-16">
                   <h4 className="text-7xl font-black uppercase leading-[0.8] tracking-tighter max-w-[85%] group-hover:text-blue-700 transition-colors">{m.titulo}</h4>
                   <span className="text-slate-300 font-black uppercase text-base tracking-widest">{m.fecha}</span>
                </div>
                <p className="text-slate-500 font-medium italic text-5xl leading-tight mb-20 opacity-90 font-serif">"{m.descripcion}"</p>
                <div className="flex items-center gap-10 mb-20 border-t pt-10">
                  <div className="w-20 h-2 bg-blue-700 rounded-full shadow-lg shadow-blue-500/20"></div>
                  <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.5em]">PROPONENTE: <span className="text-blue-700">{m.proponente}</span></p>
                </div>
                {isAuthority && (
                   <div className="flex gap-10">
                      <button onClick={() => dispatch({ activeVote: { activa: true, asunto: m.titulo, resolucionNro: 'EXP-' + Math.floor(Math.random()*1000), inicio: new Date().toLocaleTimeString(), mociónId: m.id } })} className="flex-1 bg-blue-700 text-white py-10 rounded-[60px] font-black uppercase text-sm tracking-[0.4em] shadow-2xl hover:scale-105 transition-all active:translate-y-3 border-b-[15px] border-blue-900">Poner a Votación</button>
                      <button onClick={() => {
                        dispatch((prev: any) => ({ 
                           ...prev, 
                           mociones: prev.mociones.map((x: any) => x.id === m.id ? {...x, estado: 'ARCHIVADA'} : x) 
                        }));
                      }} className="bg-slate-100 text-slate-400 px-12 rounded-[60px] shadow-xl hover:bg-slate-950 hover:text-white transition-all active:scale-90 flex items-center justify-center"><Archive size={40}/></button>
                   </div>
                )}
             </div>
          ))}
       </div>
    </div>
  );
}

function AiModule() {
  const [prompt, setPrompt] = useState('');
  const [res, setRes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAI = async () => {
    if(!prompt) return;
    setLoading(true);
    try {
      const text = await geminiAssistant.generateAnnouncement(prompt);
      setRes(text || '');
    } catch (e) { setRes('Falla crítica en la interconexión Gemini.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-48">
       <div className="bg-[#020617] text-white p-24 rounded-[120px] shadow-3xl border-b-[35px] border-blue-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-20 opacity-10"><Cpu size={400} className="animate-pulse text-blue-400" /></div>
          <h2 className="text-[150px] font-black uppercase tracking-tighter leading-[0.7] mb-12">Gemini</h2>
          <p className="text-slate-400 font-medium text-5xl italic max-w-4xl opacity-90 leading-[1.1] tracking-tight">Potencia cognitiva para la gestión institucional del BOP 20.</p>
       </div>
       <div className="bg-white p-20 rounded-[120px] shadow-2xl border-[30px] border-slate-50 min-h-[800px] flex flex-col gap-16 border-b-[40px] border-slate-100">
          <div className="flex flex-col gap-10">
             <input placeholder="Instrucción de mando institucional..." value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full p-16 bg-slate-50 border-2 rounded-[80px] font-black uppercase text-5xl outline-none focus:border-blue-700 transition-all shadow-inner border-transparent" />
             <button onClick={handleAI} disabled={loading} className="bg-blue-700 text-white px-32 py-12 rounded-[80px] font-black uppercase text-xl tracking-[1em] shadow-[0_40px_80px_rgba(30,64,175,0.4)] hover:bg-[#020617] transition-all flex items-center justify-center gap-12 disabled:opacity-50 border-b-[20px] border-blue-950 active:border-b-0 active:translate-y-8">
                {loading ? <RefreshCcw className="animate-spin" size={60}/> : <Zap size={60} className="fill-current"/>} Procesar Núcleo
             </button>
          </div>
          <div className="font-serif text-[54px] italic text-slate-800 leading-[1.1] whitespace-pre-wrap flex-1 bg-white p-24 rounded-[100px] shadow-inner min-h-[600px] text-center flex items-center justify-center border border-slate-100 border-t-[20px]">
             {res || <span className="opacity-10 uppercase tracking-[1em] font-sans text-4xl">A la espera de instrucciones técnicos</span>}
          </div>
       </div>
    </div>
  );
}

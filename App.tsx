
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Role, User, NewsItem, VoteSession, VoteType, Moción, SystemLog, ArchivedResolution, AppState, Reclamo, FinancialMovement, Peticion } from './types';
import { INITIAL_USERS, INITIAL_NEWS } from './constants';
import { 
  Users, Vote, Calendar, Newspaper, LogOut, Menu, Mic2, FileText, 
  Landmark, Info, Send, Check, Archive, Home, Zap, ShieldCheck, UserPlus, Trash2, 
  RotateCcw, Gavel, BarChart3, ShieldAlert, Settings, Download, Cpu, 
  AlertCircle, LayoutDashboard, History, MessageSquareText, Search, Plus,
  ChevronRight, Clock, Trophy, Palette, DollarSign, Scale, Globe, PartyPopper,
  AlertTriangle, BookOpen, PenTool, Printer, XCircle, CheckCircle, Inbox, Shield, Lock, FileCheck,
  CloudLightning, Wifi
} from 'lucide-react';
import { geminiAssistant } from './geminiService';
import Gun from 'gun/gun';

// Inicialización de Gun con servidores relay públicos para sincronización global
const gun = Gun([
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun'
]);
const BOP_NODE_KEY = 'bop20_official_state_v10'; // Cambiar versión si se desea resetear la red

const SYMBOLS = {
  escudoArg: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Coat_of_arms_of_Argentina.svg",
  banderaArg: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_Argentina.svg/2560px-Flag_of_Argentina.svg.png",
  logoBop20: "https://bop20.edu.ar/wp-content/uploads/cropped-LOGO-BOP20-2023-126x130.jpg"
};

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [isSynced, setIsSynced] = useState(false);

  const [appState, setAppState] = useState<AppState>({
    users: INITIAL_USERS,
    news: INITIAL_NEWS,
    logs: [],
    mociones: [],
    reclamos: [],
    historialResoluciones: [],
    finanzas: [],
    peticiones: [],
    activeVote: null,
    sessionActive: false,
    speakerId: null,
    sessionStartTime: null,
    waitingList: []
  });

  // Suscripción en tiempo real a la red global
  useEffect(() => {
    const node = gun.get(BOP_NODE_KEY);
    
    node.on((data) => {
      if (data && data.fullState) {
        try {
          const parsed = JSON.parse(data.fullState);
          setAppState(parsed);
          setIsSynced(true);
        } catch (e) {
          console.error("Error parsing sync data", e);
        }
      }
    });

    return () => node.off();
  }, []);

  const dispatch = useCallback((updates: Partial<AppState> | ((prev: AppState) => AppState)) => {
    setAppState(prev => {
      const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      
      // Enviamos el estado a la red global (Gun)
      gun.get(BOP_NODE_KEY).put({
        fullState: JSON.stringify(next),
        lastUpdate: Date.now()
      });

      return next;
    });
  }, []);

  const isPresident = currentUser?.dni === '49993070';
  const currentSpeaker = useMemo(() => appState.users.find(u => u.id === appState.speakerId), [appState.users, appState.speakerId]);
  const presentCount = useMemo(() => appState.users.filter(u => u.confirmado).length, [appState.users]);
  const totalUsers = appState.users.length;
  const hasQuorum = presentCount > totalUsers / 2;

  const currentGlobalUser = useMemo(() => appState.users.find(u => u.id === currentUser?.id), [appState.users, currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appState.users.find(u => u.dni === dniInput && dniInput === passInput && u.activo);
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
    } else {
      alert('IDENTIFICACIÓN INCORRECTA');
    }
  };

  const handleToggleSession = () => {
    if (!isPresident) return;
    dispatch(prev => ({ 
      ...prev, 
      sessionActive: !prev.sessionActive,
      sessionStartTime: !prev.sessionActive ? new Date().toLocaleTimeString() : null,
      speakerId: null,
      waitingList: [],
      users: prev.sessionActive ? prev.users.map(u => ({ ...u, votoActual: null, pedirPalabra: 'NINGUNO' })) : prev.users
    }));
  };

  const menuItems = useMemo(() => [
    { id: 'home', label: 'Inicio', icon: <Home size={20}/>, cat: 'Principal' },
    { id: 'attendance', label: 'Asistencia', icon: <Calendar size={20}/>, cat: 'Sala' },
    { id: 'recinto', label: 'Recinto', icon: <Landmark size={20}/>, cat: 'Sala' },
    { id: 'voting', label: 'Escrutinio', icon: <Vote size={20}/>, cat: 'Sala' },
    { id: 'speaker_queue', label: 'Oradores', icon: <Mic2 size={20}/>, cat: 'Sala' },
    { id: 'mociones', label: 'Mociones', icon: <FileText size={20}/>, cat: 'Sala' },
    { id: 'historial', label: 'Actas Oficiales', icon: <History size={20}/>, cat: 'Archivo' },
    { id: 'sec_gral', label: 'Sec. General', icon: <ShieldCheck size={20}/>, cat: 'Secretarías' },
    { id: 'sec_actas', label: 'Sec. Actas', icon: <BookOpen size={20}/>, cat: 'Secretarías' },
    { id: 'sec_prensa', label: 'Sec. Prensa', icon: <Newspaper size={20}/>, cat: 'Secretarías' },
    { id: 'sec_cultura', label: 'Sec. Cultura', icon: <Palette size={20}/>, cat: 'Secretarías' },
    { id: 'sec_deportes', label: 'Sec. Deportes', icon: <Trophy size={20}/>, cat: 'Secretarías' },
    { id: 'sec_derecho', label: 'Sec. Derechos', icon: <Scale size={20}/>, cat: 'Secretarías' },
    { id: 'sec_finanzas', label: 'Sec. Finanzas', icon: <DollarSign size={20}/>, cat: 'Secretarías' },
    { id: 'sec_festejos', label: 'Sec. Festejos', icon: <PartyPopper size={20}/>, cat: 'Secretarías' },
    { id: 'sec_rel_ext', label: 'Rel. Exteriores', icon: <Globe size={20}/>, cat: 'Secretarías' },
  ], []);

  const allowedMenuItems = useMemo(() => {
    if (!currentUser) return menuItems.filter(item => item.cat !== 'Secretarías');
    
    return menuItems.filter(item => {
      if (isPresident) return true;
      const userRole = currentUser?.cargo;
      if (item.cat === 'Secretarías') {
          if (!userRole) return false;
          const roleMatch = item.id.replace('sec_', '').replace('_', ' ');
          return userRole.toLowerCase().includes(roleMatch.toLowerCase());
      }
      return true;
    });
  }, [currentUser, isPresident, menuItems]);

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="bg-white p-16 shadow-2xl w-full max-w-lg rounded-[3rem] text-center border-t-[12px] border-blue-900 z-10 animate-in">
           <img src={SYMBOLS.logoBop20} alt="Logo B.O.P. Nº 20" className="h-40 mx-auto mb-10 drop-shadow-xl rounded-full object-cover" />
           <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter mb-2">B.O.P. Nº 20</h1>
           <p className="text-xs font-bold text-blue-800 uppercase tracking-[0.5em] mb-12 opacity-60">CENTRO DE ESTUDIANTES</p>
           
           <form onSubmit={handleLogin} className="space-y-5">
              <input type="text" placeholder="DNI" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full bg-slate-100 p-6 font-black text-center rounded-2xl border-2 border-slate-50 outline-none focus:border-blue-900 focus:bg-white transition-all text-xl" />
              <input type="password" placeholder="CLAVE" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full bg-slate-100 p-6 font-black text-center rounded-2xl border-2 border-slate-50 outline-none focus:border-blue-900 focus:bg-white transition-all text-xl" />
              <button className="w-full bg-blue-950 text-white p-6 rounded-2xl font-black uppercase text-sm tracking-[0.3em] hover:bg-blue-800 shadow-xl transition-all active:scale-95">
                Acceder al Sistema
              </button>
           </form>
           {isSynced && <p className="mt-6 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">● Conectado a la Red Global BOP 20</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-['Inter'] overflow-hidden text-slate-900">
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-[#0F172A] flex flex-col transition-all duration-300 z-50 shadow-2xl`}>
        <div className="h-28 flex items-center px-8 border-b border-white/5 bg-slate-950/40">
           <img src={SYMBOLS.logoBop20} className="h-14 drop-shadow-md rounded-full object-cover" />
           {!isSidebarCollapsed && (
             <div className="ml-4">
                <h2 className="font-black text-white text-lg tracking-tighter uppercase leading-none">C.E. BOP 20</h2>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Puerto Esperanza</p>
             </div>
           )}
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-6 overflow-y-auto custom-scrollbar">
           {['Principal', 'Sala', 'Secretarías', 'Archivo'].map(cat => {
             const items = allowedMenuItems.filter(i => i.cat === cat);
             if (items.length === 0) return null;
             return (
               <div key={cat} className="space-y-1">
                 {!isSidebarCollapsed && <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mb-2">{cat}</p>}
                 {items.map(item => (
                   <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id)} 
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                   >
                      <div className="transition-transform group-hover:scale-110">{item.icon}</div>
                      {!isSidebarCollapsed && <span className="text-[11px] font-black uppercase tracking-wider truncate">{item.label}</span>}
                   </button>
                 ))}
               </div>
             );
           })}
        </nav>

        <div className="p-6 bg-slate-950 flex items-center gap-4 border-t border-white/5">
           <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-black text-white text-sm border border-white/10">{currentUser?.nombre[0]}</div>
           {!isSidebarCollapsed && (
             <div className="flex-1 truncate">
                <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">{currentUser?.nombre} {currentUser?.apellido}</p>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{currentUser?.cargo}</p>
             </div>
           )}
           <button onClick={() => setIsLogged(false)} className="p-2 text-slate-500 hover:text-red-500"><LogOut size={20}/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white border-b border-slate-200 px-12 flex items-center justify-between z-40 shadow-sm">
           <div className="flex items-center gap-8">
              <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-4 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-2xl transition-all">
                <Menu size={24}/>
              </button>
              <div className="h-10 w-px bg-slate-200"></div>
              
              <div className="flex items-center gap-2 text-emerald-500" title="Sincronización Global Activa">
                <Wifi size={18} className={isSynced ? 'animate-pulse' : 'opacity-20'} />
                <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">Nube OK</span>
              </div>

              <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest border-2 ${appState.sessionActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                 <div className={`w-2.5 h-2.5 rounded-full ${appState.sessionActive ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                 {appState.sessionActive ? 'SALA EN SESIÓN' : 'RECESO'}
              </div>
              {appState.sessionActive && currentSpeaker && (
                <div className="flex items-center gap-4 bg-blue-900 text-white px-6 py-2.5 rounded-full animate-in shadow-lg">
                   <Mic2 size={16} className="text-red-400 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest">ORADOR: {currentSpeaker.nombre}</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-6">
              {isPresident && (
                <button onClick={handleToggleSession} className={`px-10 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-b-[6px] active:translate-y-1 active:border-b-0 ${appState.sessionActive ? 'bg-red-700 text-white border-red-900' : 'bg-slate-900 text-white border-black'}`}>
                   {appState.sessionActive ? 'Levantar Sesión' : 'Abrir Sesión'}
                </button>
              )}
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase text-slate-400">{new Date().toLocaleDateString()}</p>
                 <p className="text-[12px] font-black text-slate-900 leading-none mt-1">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <img src={SYMBOLS.logoBop20} className="h-10 w-10 rounded-full shadow-sm border border-slate-200 object-cover" title="B.O.P. Nº 20" />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
           <div className="max-w-7xl mx-auto space-y-12 pb-12">
             {activeTab === 'home' && <HomeModule user={currentUser!} appState={appState} setActiveTab={setActiveTab} isPresident={isPresident} dispatch={dispatch} hasQuorum={hasQuorum} />}
             {activeTab === 'attendance' && <AttendanceModule appState={appState} dispatch={dispatch} hasQuorum={hasQuorum} presentCount={presentCount} total={totalUsers} isPresident={isPresident} />}
             {activeTab === 'recinto' && <RecintoModule users={appState.users} appState={appState} />}
             {activeTab === 'voting' && <VotingModule appState={appState} currentUser={currentGlobalUser!} dispatch={dispatch} setActiveTab={setActiveTab} isPresident={isPresident} />}
             {activeTab === 'mociones' && <MocionesModule mociones={appState.mociones} dispatch={dispatch} currentUser={currentUser!} isPresident={isPresident} />}
             {activeTab === 'speaker_queue' && <SpeakerQueueModule appState={appState} dispatch={dispatch} isPresident={isPresident} currentUser={currentUser!} />}
             {activeTab === 'historial' && <HistoryModule resolutions={appState.historialResoluciones} />}
             {activeTab.startsWith('sec_') && <SecretaryModule id={activeTab} appState={appState} dispatch={dispatch} currentUser={currentUser!} isPresident={isPresident} />}
           </div>
        </div>
      </main>
    </div>
  );
}

// Los submódulos se mantienen iguales pero ahora sus props (appState, dispatch) 
// están vinculados a Gun.js, lo que hace que todo sea global.

function HomeModule({ user, appState, setActiveTab, isPresident, dispatch, hasQuorum }: any) {
  const isWaiting = appState.waitingList.includes(user.id);
  
  return (
    <div className="space-y-10 animate-in">
       <div className="bg-[#0F172A] text-white p-20 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] scale-150 rotate-12 transition-all group-hover:rotate-0">
             <img src={SYMBOLS.logoBop20} className="h-[500px] rounded-full object-cover" />
          </div>
          <div className="relative z-10">
            <h2 className="text-7xl font-black uppercase tracking-tighter leading-[0.85] mb-8">Bienvenido, <br/> {user.nombre}</h2>
            <div className="flex flex-wrap gap-4 items-center">
               <span className="px-6 py-2 bg-blue-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{user.cargo}</span>
               <span className="px-6 py-2 bg-slate-800 text-slate-300 rounded-full text-[10px] font-black uppercase tracking-widest">Institución Educativa • B.O.P. Nº 20</span>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <ActionCard icon={<Mic2 size={32}/>} label={isWaiting ? "Cancelar Palabra" : "Pedir Palabra"} color="bg-blue-600" onClick={() => {
              if (isWaiting) {
                dispatch((prev: AppState) => ({ ...prev, waitingList: prev.waitingList.filter(id => id !== user.id) }));
              } else {
                dispatch((prev: AppState) => ({ ...prev, waitingList: [...prev.waitingList, user.id] }));
              }
          }} />
          <ActionCard icon={<FileText size={32}/>} label="Nueva Moción" color="bg-indigo-600" onClick={() => setActiveTab('mociones')} />
          <ActionCard icon={<Calendar size={32}/>} label="Ver Asistencia" color="bg-emerald-600" onClick={() => setActiveTab('attendance')} />
          <ActionCard icon={<Landmark size={32}/>} label="Ver Recinto" color="bg-slate-700" onClick={() => setActiveTab('recinto')} />
          
          {isPresident && (
            <>
              <ActionCard icon={<Mic2 size={32}/>} label="Ceder Palabra" color="bg-red-600" onClick={() => setActiveTab('speaker_queue')} />
              <ActionCard icon={<Gavel size={32}/>} label="Votaciones" color="bg-amber-600" onClick={() => setActiveTab('voting')} />
              <ActionCard icon={<History size={32}/>} label="Actas" color="bg-slate-900" onClick={() => setActiveTab('historial')} />
              <ActionCard icon={<ShieldAlert size={32}/>} label="Auditoría" color="bg-red-900" onClick={() => {}} />
            </>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border space-y-6">
             <h3 className="text-2xl font-black uppercase border-b pb-4">Navegación Rápida</h3>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('voting')} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all font-bold text-xs uppercase"><Vote size={18}/> Tablero Votos</button>
                <button onClick={() => setActiveTab('historial')} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all font-bold text-xs uppercase"><History size={18}/> Historial Actas</button>
                <button onClick={() => setActiveTab('sec_prensa')} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all font-bold text-xs uppercase"><Newspaper size={18}/> Prensa</button>
                <button onClick={() => setActiveTab('sec_derecho')} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-all font-bold text-xs uppercase"><Scale size={18}/> Derechos</button>
             </div>
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border space-y-6">
             <h3 className="text-2xl font-black uppercase border-b pb-4">Estado de Sala</h3>
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representantes en Sala</p>
                   <p className="text-4xl font-black">{appState.users.filter(u => u.confirmado).length} / {appState.users.length}</p>
                </div>
                <div className={`p-6 rounded-3xl ${hasQuorum ? 'bg-sky-100 text-sky-700' : 'bg-red-50 text-red-700'} font-black uppercase text-[10px]`}>
                   {hasQuorum ? 'Quórum OK' : 'Falta Quórum'}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function ActionCard({ icon, label, color, onClick }: any) {
  return (
    <button onClick={onClick} className={`${color} text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center gap-4 hover:scale-105 transition-all border-b-[10px] border-black/20 group`}>
       <div className="group-hover:scale-110 transition-transform">{icon}</div>
       <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

function VotingModule({ appState, currentUser, dispatch, setActiveTab, isPresident }: any) {
  const confirmedPresent = appState.users.filter(u => u.confirmado);
  
  const stats = useMemo(() => {
    const s = { YES: 0, NO: 0, ABS: 0, TOTAL: 0 };
    confirmedPresent.forEach(u => {
      if (u.votoActual === 'YES') s.YES++;
      else if (u.votoActual === 'NO') s.NO++;
      else if (u.votoActual === 'ABSTAIN') s.ABS++;
      if (u.votoActual) s.TOTAL++;
    });
    return s;
  }, [confirmedPresent]);

  const hasVoted = currentUser?.votoActual !== null;
  const isEligible = currentUser?.confirmado;

  if (!appState.activeVote) return (
    <div className="text-center py-64 bg-white rounded-[4rem] shadow-2xl border flex flex-col items-center group">
       <Gavel size={120} className="text-slate-100 mb-10 group-hover:text-blue-900 transition-all duration-1000" />
       <h3 className="text-6xl font-black uppercase text-slate-300 tracking-tighter italic">Escrutinio Cerrado</h3>
       <p className="mt-4 text-xl font-bold text-slate-200 uppercase tracking-widest">NO HAY VOTACIONES ACTIVAS EN ESTE MOMENTO</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in pb-12">
      <div className="bg-[#1e293b] p-12 rounded-[3rem] shadow-2xl border-b-[15px] border-slate-900 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
             <div className="bg-amber-500 p-3 rounded-xl shadow-lg"><Gavel className="text-white" /></div>
             <span className="bg-blue-600 text-[10px] font-black px-4 py-2 rounded-lg text-white uppercase tracking-widest">EXPEDIENTE Nº {appState.activeVote.resolucionNro}</span>
          </div>
          <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-[0.9] italic">"{appState.activeVote.asunto}"</h2>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-slate-800 p-6 rounded-3xl min-w-[140px] text-center border border-white/5">
              <p className="text-[10px] font-black uppercase text-green-500 mb-1">AFIRMATIVOS</p>
              <p className="text-6xl font-black text-white leading-none">{stats.YES}</p>
           </div>
           <div className="bg-slate-800 p-6 rounded-3xl min-w-[140px] text-center border border-white/5">
              <p className="text-[10px] font-black uppercase text-red-500 mb-1">NEGATIVOS</p>
              <p className="text-6xl font-black text-white leading-none">{stats.NO}</p>
           </div>
           <div className="bg-slate-800 p-6 rounded-3xl min-w-[140px] text-center border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">ABSTENCIONES</p>
              <p className="text-6xl font-black text-white leading-none">{stats.ABS}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-[#020617] rounded-[4rem] p-12 shadow-3xl flex flex-col items-center border border-white/5 min-h-[500px]">
           <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-12">Tablero Nominal de Sesión</h3>
           <div className="relative w-full h-full flex items-center justify-center">
             <svg width="400" height="250" viewBox="0 0 400 250" className="overflow-visible">
                {confirmedPresent.map((u, i) => {
                  const angle = Math.PI - (i / (confirmedPresent.length - 1)) * Math.PI;
                  const cx = 200 + Math.cos(angle) * 160;
                  const cy = 230 - Math.sin(angle) * 140;
                  let fill = '#334155';
                  if (u.votoActual === 'YES') fill = '#22c55e';
                  if (u.votoActual === 'NO') fill = '#ef4444';
                  if (u.votoActual === 'ABSTAIN') fill = '#64748b';
                  return (
                    <g key={u.id} className="transition-all duration-700">
                      <circle cx={cx} cy={cy} r="8" fill={fill} className="shadow-2xl" />
                      <text x={cx} y={cy - 12} textAnchor="middle" fill="white" className="text-[5px] font-black uppercase opacity-20 pointer-events-none">{u.nombre[0]}</text>
                    </g>
                  );
                })}
             </svg>
           </div>
           <div className="mt-8 flex gap-8 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> SÍ</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> NO</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500"></div> ABST.</span>
           </div>
        </div>

        <div className="bg-white rounded-[4rem] p-16 shadow-3xl border flex flex-col justify-center items-center text-center">
           {!isEligible ? (
             <div className="space-y-6">
                <AlertTriangle size={80} className="mx-auto text-amber-500 animate-bounce" />
                <h4 className="text-4xl font-black uppercase text-slate-900 tracking-tighter">Sin Acreditación</h4>
                <p className="text-slate-500 font-bold max-w-sm">No puede emitir su voto porque no ha sido validado en la asistencia por Presidencia.</p>
             </div>
           ) : hasVoted ? (
             <div className="space-y-8 animate-in">
                <div className="bg-green-50 p-12 rounded-[3rem] border-2 border-green-200">
                   <FileCheck size={100} className="mx-auto text-green-600 mb-6" />
                   <h4 className="text-5xl font-black uppercase text-green-800 tracking-tighter">Voto Registrado</h4>
                   <p className="text-green-700 font-black uppercase text-xs tracking-widest mt-4">Comprobante Nº {Math.floor(Math.random()*100000)}</p>
                </div>
                <div className="flex items-center justify-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                   <span className="text-[10px] font-black uppercase tracking-widest">Su Sufragio:</span>
                   <span className={`px-6 py-2 rounded-full text-xs font-black uppercase ${currentUser.votoActual === 'YES' ? 'bg-green-600' : currentUser.votoActual === 'NO' ? 'bg-red-600' : 'bg-slate-500'}`}>
                      {currentUser.votoActual === 'YES' ? 'AFIRMATIVO' : currentUser.votoActual === 'NO' ? 'NEGATIVO' : 'ABSTENCIÓN'}
                   </span>
                </div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Usted ya ha participado de este escrutinio.</p>
             </div>
           ) : (
             <div className="w-full space-y-12">
                <div className="space-y-2">
                   <h3 className="text-6xl font-black uppercase tracking-tighter leading-none italic">Emitir Sufragio</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">B.O.P. Nº 20 • SESIÓN ORDINARIA</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6 w-full max-w-md mx-auto">
                   <button 
                    onClick={() => dispatch((prev: AppState) => ({ ...prev, users: prev.users.map(u => u.id === currentUser.id ? {...u, votoActual: 'YES'} : u) }))} 
                    className="bg-green-600 text-white p-8 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-xl border-b-[10px] border-green-800 flex items-center justify-center gap-6 hover:scale-105 active:translate-y-2 active:border-b-0 transition-all"
                   >
                     <CheckCircle size={32} /> AFIRMATIVO
                   </button>
                   <button 
                    onClick={() => dispatch((prev: AppState) => ({ ...prev, users: prev.users.map(u => u.id === currentUser.id ? {...u, votoActual: 'NO'} : u) }))} 
                    className="bg-red-600 text-white p-8 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-xl border-b-[10px] border-red-800 flex items-center justify-center gap-6 hover:scale-105 active:translate-y-2 active:border-b-0 transition-all"
                   >
                     <XCircle size={32} /> NEGATIVO
                   </button>
                   <button 
                    onClick={() => dispatch((prev: AppState) => ({ ...prev, users: prev.users.map(u => u.id === currentUser.id ? {...u, votoActual: 'ABSTAIN'} : u) }))} 
                    className="bg-slate-500 text-white p-8 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-xl border-b-[10px] border-slate-700 flex items-center justify-center gap-6 hover:scale-105 active:translate-y-2 active:border-b-0 transition-all"
                   >
                     <RotateCcw size={32} /> ABSTENCIÓN
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>

      {isPresident && (
        <div className="bg-white p-12 rounded-[4rem] shadow-3xl border-t-[15px] border-amber-600 animate-in flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-8">
              <div className="bg-amber-100 p-6 rounded-[2rem]"><Shield size={40} className="text-amber-700" /></div>
              <div>
                 <h4 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Control de Escrutinio</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facultades Exclusivas de Presidencia</p>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => {
                  if(confirm("¿Desea borrar todos los votos emitidos? Esta acción es irreversible.")) {
                    dispatch((prev: AppState) => ({ ...prev, users: prev.users.map(u => ({...u, votoActual: null})) }));
                  }
                }} 
                className="bg-slate-200 text-slate-700 px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-3"
              >
                <RotateCcw size={18}/> Reiniciar Tablero
              </button>
              
              <button 
                onClick={() => {
                   const res = stats.YES > stats.NO ? 'APROBADA' : 'RECHAZADA';
                   const nuevaRes: ArchivedResolution = {
                      id: Date.now().toString(),
                      asunto: appState.activeVote!.asunto,
                      fecha: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
                      resultado: res,
                      votosSi: stats.YES,
                      votosNo: stats.NO,
                      votosAbs: stats.ABS,
                      textoLegal: `Sancionado en Puerto Esperanza por el Centro de Estudiantes BOP 20. Con un total de ${stats.TOTAL} votos emitidos.`
                   };
                   dispatch((prev: AppState) => ({
                      ...prev,
                      activeVote: null,
                      users: prev.users.map(u => ({...u, votoActual: null})),
                      historialResoluciones: [nuevaRes, ...(prev.historialResoluciones || [])]
                   }));
                   setActiveTab('historial');
                   alert("ESCRUTINIO CERRADO Y ARCHIVADO CORRECTAMENTE.");
                }} 
                className="bg-slate-900 text-white px-14 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-2xl transition-all border-b-[10px] border-black flex items-center gap-4"
              >
                <Lock size={20}/> Cerrar y Archivar
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

function AttendanceModule({ appState, dispatch, hasQuorum, presentCount, total, isPresident }: any) {
  return (
    <div className="space-y-12 animate-in">
       <div className={`p-16 rounded-[4rem] shadow-2xl border flex flex-col md:flex-row justify-between items-center transition-all duration-700 relative overflow-hidden ${hasQuorum ? 'bg-quorum-active border-sky-300' : 'bg-white border-slate-200'}`}>
          <div className="relative z-10 space-y-4 text-center md:text-left">
             <h3 className={`text-7xl font-black uppercase tracking-tighter leading-none ${hasQuorum ? 'text-sky-900' : 'text-slate-900'}`}>Acreditación</h3>
             <p className={`text-xl font-black uppercase tracking-[0.4em] ${hasQuorum ? 'text-sky-600' : 'text-red-600'}`}>
                {hasQuorum ? 'QUÓRUM ALCANZADO' : 'QUÓRUM INSUFICIENTE'}
             </p>
          </div>
          <div className="text-right relative z-10 mt-8 md:mt-0">
             <div className="flex items-baseline gap-6 justify-center md:justify-end">
                <span className={`text-[12rem] font-black leading-none ${hasQuorum ? 'text-sky-800' : 'text-red-800'}`}>{presentCount}</span>
                <span className="text-6xl font-black text-slate-300">/ {total}</span>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {appState.users.map((u: User) => (
             <div key={u.id} className={`p-10 rounded-[3rem] border-[6px] transition-all flex flex-col items-center text-center group ${u.confirmado ? 'bg-white border-green-500 shadow-2xl scale-105' : 'bg-slate-50 border-transparent opacity-40 grayscale'}`}>
                <div className={`w-24 h-24 rounded-[2rem] mb-6 flex items-center justify-center text-4xl font-black transition-colors ${u.confirmado ? 'bg-green-50 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                   {u.nombre[0]}
                </div>
                <p className="font-black uppercase text-2xl mb-2">{u.nombre}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-10 h-10 overflow-hidden">{u.cargo}</p>
                {isPresident && (
                   <button 
                    onClick={() => dispatch((prev: AppState) => ({ ...prev, users: prev.users.map((usr: User) => usr.id === u.id ? { ...usr, confirmado: !usr.confirmado } : usr) }))} 
                    className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg border-b-4 transition-all active:scale-95 ${u.confirmado ? 'bg-red-500 text-white border-red-800' : 'bg-green-600 text-white border-green-800'}`}
                   >
                     {u.confirmado ? 'Dar Baja' : 'Validar'}
                   </button>
                )}
             </div>
          ))}
       </div>
    </div>
  );
}

function MocionesModule({ mociones, dispatch, currentUser, isPresident }: any) {
    const [t, setT] = useState('');
    const [d, setD] = useState('');
    
    const updateMotion = (id: string, state: Moción['estado']) => {
        dispatch((prev: AppState) => ({
            ...prev,
            mociones: prev.mociones.map(m => m.id === id ? { ...m, estado: state } : m)
        }));
    };

    const pendingMotions = mociones.filter((m: Moción) => m.estado === 'PENDIENTE');
    const archivedMotions = mociones.filter((m: Moción) => m.estado === 'ARCHIVADA');

    return (
        <div className="space-y-12 animate-in">
            <div className="bg-white p-14 rounded-[4rem] shadow-xl border border-b-[20px] border-blue-900">
                <h3 className="text-4xl font-black uppercase mb-12 flex items-center gap-6 leading-none"><FileText size={40} className="text-blue-900" /> Elevar Nueva Moción</h3>
                <div className="space-y-6">
                    <input placeholder="Título del Asunto..." value={t} onChange={e => setT(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl font-black text-2xl shadow-inner outline-none focus:border-blue-900 transition-all" />
                    <textarea placeholder="Fundamentación y texto legal..." value={d} onChange={e => setD(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-3xl text-2xl h-64 shadow-inner outline-none focus:border-blue-900 transition-all leading-relaxed" />
                    <button onClick={() => {
                        if(!t || !d) return;
                        const m: Moción = { id: Date.now().toString(), titulo: t, descripcion: d, proponente: currentUser.nombre, estado: 'PENDIENTE', fecha: new Date().toLocaleDateString() };
                        dispatch((prev: AppState) => ({ ...prev, mociones: [m, ...(prev.mociones || [])] }));
                        setT(''); setD('');
                    }} className="bg-blue-900 text-white px-20 py-7 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-slate-900 transition-all border-b-[12px] border-blue-950">Presentar ante el Plenario</button>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-3xl font-black uppercase border-l-[15px] border-blue-700 pl-6">Mociones en Tratamiento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {pendingMotions.map((m: Moción) => (
                        <MotionCard key={m.id} m={m} isPresident={isPresident} onAction={updateMotion} dispatch={dispatch} />
                    ))}
                    {pendingMotions.length === 0 && <p className="text-slate-400 italic font-bold">Sin mociones pendientes.</p>}
                </div>
            </div>

            {archivedMotions.length > 0 && (
                <div className="space-y-6">
                    <h3 className="text-3xl font-black uppercase border-l-[15px] border-slate-500 pl-6 text-slate-500">Mociones Archivadas</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {archivedMotions.map((m: Moción) => (
                            <MotionCard key={m.id} m={m} isPresident={isPresident} onAction={updateMotion} dispatch={dispatch} archived />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MotionCard({ m, isPresident, onAction, dispatch, archived }: any) {
    return (
        <div className={`bg-white p-14 rounded-[4rem] shadow-xl border-t-[15px] ${archived ? 'border-slate-400 opacity-80' : 'border-blue-900'} relative group overflow-hidden`}>
            <div className="absolute right-0 top-0 p-8 opacity-[0.03] scale-150 group-hover:rotate-12 transition-transform"><FileText size={150}/></div>
            <h4 className="text-4xl font-black uppercase leading-[0.9] tracking-tighter mb-8 group-hover:text-blue-900 transition-colors">{m.titulo}</h4>
            <p className="text-slate-500 text-2xl italic font-serif leading-snug mb-10 opacity-80 line-clamp-4">"{m.descripcion}"</p>
            <div className="flex flex-col gap-6 pt-8 border-t">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">PROPUESO POR: {m.proponente}</span>
                {isPresident && (
                    <div className="flex flex-wrap gap-3">
                        {!archived && (
                            <button onClick={() => onAction(m.id, 'ARCHIVADA')} className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-slate-300 transition-all">Archivar</button>
                        )}
                        {archived && (
                             <button onClick={() => onAction(m.id, 'PENDIENTE')} className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-slate-300 transition-all">Restaurar</button>
                        )}
                        <button onClick={() => {
                            dispatch((prev: AppState) => ({ 
                                ...prev, 
                                activeVote: { activa: true, asunto: m.titulo, resolucionNro: Math.floor(Math.random()*1000).toString(), inicio: new Date().toLocaleTimeString(), mociónId: m.id } 
                            }));
                        }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-blue-700 transition-all shadow-lg">Mandar a Escrutinio</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function RecintoModule({ users, appState }: { users: User[], appState: AppState }) {
  const getPosition = (i: number, total: number) => {
    const radius = 350;
    const angleRange = Math.PI * 0.9;
    const angle = Math.PI - (i / (total - 1)) * angleRange - (Math.PI - angleRange) / 2;
    return {
      x: Math.cos(angle) * radius,
      y: -Math.sin(angle) * radius * 0.8
    };
  };

  return (
    <div className="bg-[#020617] p-24 rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] min-h-[900px] flex flex-col items-center justify-center relative overflow-hidden border-b-[40px] border-black animate-in">
       <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <img src={SYMBOLS.logoBop20} className="h-[500px] rounded-full grayscale brightness-50 object-cover" />
       </div>
       
       <div className="relative flex-1 w-full flex justify-center items-end pb-48 scale-110">
          {users.map((u, i) => {
             const { x, y } = getPosition(i, users.length);
             let seatColor = 'bg-slate-800 border-slate-700';
             if (u.confirmado) {
                seatColor = 'bg-white border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]';
                if (u.pedirPalabra === 'ESPERA') seatColor = 'bg-yellow-400 border-yellow-200 animate-pulse';
                if (u.pedirPalabra === 'CONCEDIDA') seatColor = 'bg-sky-500 border-sky-300 scale-125 z-40';
             }

             return (
                <div key={u.id} style={{ transform: `translate(${x}px, ${y}px)` }} className={`absolute w-12 h-12 rounded-full border-[3px] transition-all duration-700 flex items-center justify-center group ${seatColor}`}>
                   <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-white text-slate-950 p-5 rounded-3xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-2xl scale-75 group-hover:scale-100 origin-bottom border-b-8 border-blue-900 font-black uppercase text-[10px]">
                      {u.nombre}
                   </div>
                </div>
             );
          })}
          
          <div className="w-[500px] h-48 bg-white border-b-[25px] border-slate-800 rounded-t-[120px] flex flex-col items-center justify-center text-slate-950 shadow-3xl relative z-20">
             <img src={SYMBOLS.logoBop20} className="h-28 mb-4 rounded-full object-cover" />
             <span className="text-xl font-black uppercase tracking-[1em] opacity-30 leading-none">Presidencia</span>
          </div>
       </div>
    </div>
  );
}

function SpeakerQueueModule({ appState, dispatch, isPresident, currentUser }: any) {
  const isWaiting = appState.waitingList.includes(currentUser.id);
  return (
    <div className="space-y-12 animate-in">
       <div className="bg-slate-900 text-white p-16 rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border-b-[20px] border-blue-900 overflow-hidden relative group gap-8">
          <div className="absolute right-0 top-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><Mic2 size={300} /></div>
          <div className="flex items-center gap-12 relative z-10">
             <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${appState.speakerId ? 'bg-red-700 animate-pulse' : 'bg-slate-800'}`}>
                <Mic2 size={50} />
             </div>
             <div>
                <p className="text-[11px] font-black uppercase opacity-40 tracking-[0.5em] mb-2">USO DE LA PALABRA:</p>
                <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">{appState.speakerId ? appState.users.find(u => u.id === appState.speakerId)?.nombre : 'SILENCIO'}</h3>
             </div>
          </div>
          {isPresident && appState.speakerId && (
            <button onClick={() => dispatch({ speakerId: null })} className="bg-red-600 px-12 py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-red-700 active:scale-95 transition-all relative z-10">Cortar Palabra</button>
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white p-14 rounded-[4rem] shadow-xl border relative">
             <h3 className="text-2xl font-black uppercase mb-10 border-b pb-6">Lista de Espera</h3>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                {appState.waitingList.map((id, idx) => {
                  const user = appState.users.find(u => u.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2rem] border group hover:border-blue-900 transition-all">
                       <div className="flex items-center gap-6">
                          <span className="text-4xl font-black text-slate-200 group-hover:text-blue-900">#{idx+1}</span>
                          <div>
                             <p className="text-2xl font-black uppercase leading-none mb-1">{user?.nombre}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user?.cargo}</p>
                          </div>
                       </div>
                       {isPresident && (
                         <button onClick={() => dispatch((prev: AppState) => ({ ...prev, speakerId: id, waitingList: prev.waitingList.filter(wid => wid !== id) }))} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Ceder</button>
                       )}
                    </div>
                  );
                })}
                {appState.waitingList.length === 0 && <p className="text-center py-20 text-2xl font-black text-slate-200 uppercase italic">Sin pedidos</p>}
             </div>
          </div>

          <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[4rem] border shadow-xl group">
             <button 
              onClick={() => {
                  if (isWaiting) {
                    dispatch((prev: AppState) => ({ ...prev, waitingList: prev.waitingList.filter(id => id !== currentUser.id) }));
                  } else {
                    dispatch((prev: AppState) => ({ ...prev, waitingList: [...prev.waitingList, currentUser.id] }));
                  }
               }} 
               className={`w-64 h-64 md:w-80 md:h-80 rounded-[4rem] flex flex-col items-center justify-center transition-all shadow-3xl border-b-[20px] active:translate-y-4 active:border-b-0 ${isWaiting ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-900 text-white border-black group-hover:bg-blue-900'}`}
             >
                <Mic2 size={100} className="mb-6" />
                <span className="text-[14px] font-black uppercase tracking-[0.5em]">{isWaiting ? 'CANCELAR' : 'PEDIR PALABRA'}</span>
             </button>
          </div>
       </div>
    </div>
  );
}

function HistoryModule({ resolutions }: { resolutions: ArchivedResolution[] }) {
  return (
    <div className="space-y-12 animate-in pb-20">
       <div className="bg-white p-14 rounded-[4rem] shadow-xl border-b-[20px] border-blue-950 flex justify-between items-center">
          <div className="space-y-2">
             <h3 className="text-5xl md:text-6xl font-black uppercase tracking-tighter italic">Archivo Histórico</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Registro de Fe Pública • B.O.P. Nº 20</p>
          </div>
          <History size={64} className="opacity-10 hidden md:block" />
       </div>
       
       <div className="grid grid-cols-1 gap-10">
          {resolutions.length > 0 ? resolutions.map((r) => (
             <div key={r.id} className="bg-white p-12 md:p-16 rounded-[4rem] shadow-xl border-l-[30px] border-slate-900 group hover:border-blue-700 transition-all duration-700 overflow-hidden relative">
                <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                   <div className="space-y-4">
                      <span className={`px-10 py-3 rounded-full text-[12px] font-black uppercase tracking-widest shadow-md ${r.resultado === 'APROBADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.resultado}</span>
                      <p className="text-sm font-black text-slate-300 uppercase tracking-widest">{r.fecha}</p>
                   </div>
                   
                   <div className="flex gap-4">
                      <div className="text-center px-6 py-4 bg-slate-50 rounded-2xl border">
                         <p className="text-[8px] font-black uppercase text-green-600">SÍ</p>
                         <p className="text-2xl font-black">{r.votosSi}</p>
                      </div>
                      <div className="text-center px-6 py-4 bg-slate-50 rounded-2xl border">
                         <p className="text-[8px] font-black uppercase text-red-600">NO</p>
                         <p className="text-2xl font-black">{r.votosNo}</p>
                      </div>
                      <div className="text-center px-6 py-4 bg-slate-50 rounded-2xl border">
                         <p className="text-[8px] font-black uppercase text-slate-400">ABS</p>
                         <p className="text-2xl font-black">{r.votosAbs}</p>
                      </div>
                   </div>
                </div>

                <h4 className="text-4xl md:text-6xl font-black uppercase leading-[0.85] tracking-tighter mb-10 group-hover:text-blue-900 transition-colors italic">"{r.asunto}"</h4>
                <div className="p-8 md:p-12 bg-slate-50 rounded-[3rem] italic text-2xl md:text-4xl text-slate-500 font-serif leading-snug shadow-inner border border-slate-100">"{r.textoLegal}"</div>
                
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] transform scale-[4] rotate-12 pointer-events-none">
                   <img src={SYMBOLS.logoBop20} className="rounded-full" />
                </div>
             </div>
          )) : (
            <div className="text-center py-40 opacity-20">
               <History size={120} className="mx-auto mb-10" />
               <p className="text-4xl font-black uppercase tracking-widest">Sin antecedentes archivados</p>
            </div>
          )}
       </div>
    </div>
  );
}

function SecretaryModule({ id, appState, dispatch, currentUser, isPresident }: any) {
    const [peticionDesc, setPeticionDesc] = useState('');
    
    const secNameMap: Record<string, string> = {
        'sec_gral': 'General',
        'sec_actas': 'Actas',
        'sec_prensa': 'Prensa',
        'sec_cultura': 'Cultura',
        'sec_deportes': 'Deportes',
        'sec_derecho': 'Derechos',
        'sec_finanzas': 'Finanzas',
        'sec_festejos': 'Festejos',
        'sec_rel_ext': 'Rel. Exteriores'
    };
    
    const iconMap: Record<string, any> = {
        'sec_gral': <ShieldCheck size={40}/>,
        'sec_actas': <BookOpen size={40}/>,
        'sec_prensa': <Newspaper size={40}/>,
        'sec_cultura': <Palette size={40}/>,
        'sec_deportes': <Trophy size={40}/>,
        'sec_derecho': <Scale size={40}/>,
        'sec_finanzas': <DollarSign size={40}/>,
        'sec_festejos': <PartyPopper size={40}/>,
        'sec_rel_ext': <Globe size={40}/>
    };

    const peticionesParaMi = appState.peticiones.filter((p: Peticion) => p.idSecretaria === id);

    const enviarPeticion = () => {
        if (!peticionDesc) return;
        const nueva: Peticion = {
            id: Date.now().toString(),
            emisor: currentUser.nombre + ' (' + currentUser.cargo + ')',
            idSecretaria: id,
            descripcion: peticionDesc,
            fecha: new Date().toLocaleTimeString(),
            estado: 'PENDIENTE'
        };
        dispatch((prev: AppState) => ({
            ...prev,
            peticiones: [...(prev.peticiones || []), nueva]
        }));
        setPeticionDesc('');
        alert('PETICIÓN ENVIADA A SECRETARÍA');
    };

    const isAuthorized = useMemo(() => {
        if (!currentUser) return false;
        if (isPresident) return true;
        const cargo = currentUser.cargo || '';
        const currentSec = secNameMap[id] || '';
        return cargo.toLowerCase().includes(currentSec.toLowerCase());
    }, [currentUser, isPresident, id]);

    return (
        <div className="space-y-12 animate-in">
            <header className="bg-slate-900 text-white p-20 rounded-[4rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="relative z-10 text-center md:text-left">
                    <h3 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">Secretaría de {secNameMap[id]}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.5em] opacity-80">GestIÓN de Area y Peticiones</p>
                </div>
                <div className="relative z-10 opacity-20 transform scale-[2] hidden md:block">{iconMap[id]}</div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-12 rounded-[4rem] shadow-xl border space-y-8 h-fit">
                    <div className="flex items-center gap-4 border-b pb-6">
                        <Send className="text-blue-600" size={32}/>
                        <h4 className="text-3xl font-black uppercase">Nueva Petición</h4>
                    </div>
                    <textarea 
                        value={peticionDesc}
                        onChange={e => setPeticionDesc(e.target.value)}
                        placeholder="Describa su petición detalladamente..." 
                        className="w-full p-8 bg-slate-50 border-2 rounded-[2rem] h-48 shadow-inner outline-none focus:border-blue-900 transition-all font-bold text-xl" 
                    />
                    <button onClick={enviarPeticion} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl">Enviar Petición Ahora</button>
                </div>

                {isAuthorized && (
                    <div className="bg-white p-12 rounded-[4rem] shadow-xl border space-y-8">
                        <div className="flex items-center gap-4 border-b pb-6">
                            <Inbox className="text-indigo-600" size={32}/>
                            <h4 className="text-3xl font-black uppercase">Bandeja de Entrada</h4>
                        </div>
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            {peticionesParaMi.map((p: Peticion) => (
                                <div key={p.id} className="p-8 bg-slate-50 rounded-3xl border-l-[15px] border-indigo-600 space-y-4 shadow-sm animate-in">
                                    <div className="flex justify-between items-start">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.fecha}</p>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[8px] font-black uppercase">Pendiente</span>
                                    </div>
                                    <p className="text-lg font-black leading-tight">"{p.descripcion}"</p>
                                    <p className="text-[10px] font-bold text-indigo-700 uppercase">DE: {p.emisor}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            dispatch((prev: AppState) => ({
                                                ...prev,
                                                peticiones: prev.peticiones.filter(x => x.id !== p.id)
                                            }));
                                        }} className="p-3 bg-white border rounded-xl hover:bg-green-50 transition-all"><CheckCircle className="text-green-600" size={18}/></button>
                                        <button onClick={() => {
                                             dispatch((prev: AppState) => ({
                                                ...prev,
                                                peticiones: prev.peticiones.filter(x => x.id !== p.id)
                                            }));
                                        }} className="p-3 bg-white border rounded-xl hover:bg-red-50 transition-all"><XCircle className="text-red-600" size={18}/></button>
                                    </div>
                                </div>
                            ))}
                            {peticionesParaMi.length === 0 && <p className="text-center py-20 text-slate-300 font-black uppercase italic">Sin peticiones entrantes</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


import React, { useState, useMemo, useEffect, useCallback } from 'react';
// Added VoteType to types import
import { Role, User, Moción, ArchivedResolution, AppState, Peticion, VoteType } from './types';
import { INITIAL_USERS, INITIAL_NEWS } from './constants';
import { 
  Users, Vote, Calendar, Newspaper, LogOut, Menu, Mic2, FileText, 
  Landmark, Home, ShieldCheck, Gavel, History, Scale, Globe, PartyPopper,
  AlertTriangle, BookOpen, XCircle, CheckCircle, Inbox, Shield, Lock, FileCheck,
  // Added Clock icon to lucide-react imports
  Wifi, Palette, Trophy, DollarSign, Cloud, Users2, Clock
} from 'lucide-react';
import Gun from 'gun/gun';

// Inicialización de Gun con múltiples relays para redundancia
const gun = Gun([
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-us.herokuapp.com/gun'
]);

// Llave única para el BOP 20 - Puerto Esperanza
const APP_KEY = 'bop20_p esperanza_session_v2';

const SYMBOLS = {
  logoBop20: "https://bop20.edu.ar/wp-content/uploads/cropped-LOGO-BOP20-2023-126x130.jpg"
};

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [connectedPeers, setConnectedPeers] = useState(0);

  // Estado Local (UI) sincronizado con Gun
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

  // --- LÓGICA DE SINCRONIZACIÓN EN TIEMPO REAL (GUN.JS) ---
  useEffect(() => {
    const root = gun.get(APP_KEY);

    // 1. Sincronizar Estado de Sesión
    root.get('session').on((data) => {
      if (!data) return;
      setAppState(prev => ({
        ...prev,
        sessionActive: data.active,
        sessionStartTime: data.startTime,
        speakerId: data.speakerId,
        activeVote: data.activeVote ? JSON.parse(data.activeVote) : null
      }));
    });

    // 2. Sincronizar Lista de Espera (Oradores)
    root.get('waitingList').on((data) => {
      if (!data) return;
      // Gun guarda objetos, convertimos a array de IDs
      const list = Object.keys(data)
        .filter(key => key !== '_' && data[key] === true);
      setAppState(prev => ({ ...prev, waitingList: list }));
    });

    // 3. Sincronizar Usuarios (Asistencia y Votos)
    // Escuchamos cambios en cada usuario individualmente para máxima velocidad
    INITIAL_USERS.forEach(u => {
      root.get('users').get(u.id).on((data) => {
        if (!data) return;
        setAppState(prev => ({
          ...prev,
          users: prev.users.map(usr => 
            usr.id === u.id ? { ...usr, confirmado: data.confirmado, votoActual: data.votoActual } : usr
          )
        }));
      });
    });

    // 4. Sincronizar Mociones
    root.get('mociones').map().on((data, id) => {
      if (!data) return;
      setAppState(prev => {
        const exists = prev.mociones.find(m => m.id === id);
        if (exists) {
          return { ...prev, mociones: prev.mociones.map(m => m.id === id ? { ...m, ...data } : m) };
        }
        return { ...prev, mociones: [data as Moción, ...prev.mociones] };
      });
    });

    // Contador de conexiones (estimado)
    const timer = setInterval(() => {
        // @ts-ignore
        const mesh = gun._.opt.peers;
        setConnectedPeers(Object.keys(mesh || {}).length);
    }, 5000);

    return () => {
        root.off();
        clearInterval(timer);
    };
  }, []);

  // --- FUNCIONES DE DISPATCH (ENVÍO A LA RED) ---
  const isPresident = currentUser?.dni === '49993070';

  const toggleSession = () => {
    if (!isPresident) return;
    const newState = !appState.sessionActive;
    const root = gun.get(APP_KEY);
    
    root.get('session').put({
      active: newState,
      startTime: newState ? new Date().toLocaleTimeString() : null,
      speakerId: null,
      activeVote: null
    });

    // Si cerramos sesión, limpiamos votos y lista de espera
    if (!newState) {
      root.get('waitingList').put(null);
      appState.users.forEach(u => {
        root.get('users').get(u.id).put({ votoActual: null });
      });
    }
  };

  const handlePedirPalabra = () => {
    if (!currentUser) return;
    const isWaiting = appState.waitingList.includes(currentUser.id);
    gun.get(APP_KEY).get('waitingList').get(currentUser.id).put(!isWaiting);
  };

  const handleCederPalabra = (userId: string | null) => {
    if (!isPresident) return;
    gun.get(APP_KEY).get('session').put({ speakerId: userId });
    if (userId) {
        gun.get(APP_KEY).get('waitingList').get(userId).put(false);
    }
  };

  // Fix: VoteType is now properly imported from types.ts
  const handleVote = (vote: VoteType) => {
    if (!currentUser || !appState.sessionActive) return;
    gun.get(APP_KEY).get('users').get(currentUser.id).put({ votoActual: vote });
  };

  const handleToggleAttendance = (userId: string) => {
    if (!isPresident) return;
    const user = appState.users.find(u => u.id === userId);
    gun.get(APP_KEY).get('users').get(userId).put({ confirmado: !user?.confirmado });
  };

  // --- RENDER ---
  const currentSpeaker = useMemo(() => appState.users.find(u => u.id === appState.speakerId), [appState.users, appState.speakerId]);
  const presentCount = useMemo(() => appState.users.filter(u => u.confirmado).length, [appState.users]);
  const hasQuorum = presentCount > appState.users.length / 2;

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

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="bg-white p-12 shadow-2xl w-full max-w-md rounded-[3rem] text-center border-t-[12px] border-blue-900 z-10 animate-in">
           <img src={SYMBOLS.logoBop20} alt="Logo" className="h-32 mx-auto mb-8 rounded-full object-cover shadow-lg" />
           <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tighter mb-1">B.O.P. Nº 20</h1>
           <p className="text-[10px] font-bold text-blue-800 uppercase tracking-[0.3em] mb-10 opacity-60">Puerto Esperanza • Misiones</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" placeholder="DNI" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full bg-slate-50 p-5 font-black text-center rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-900 transition-all" />
              <input type="password" placeholder="CLAVE" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full bg-slate-50 p-5 font-black text-center rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-900 transition-all" />
              <button className="w-full bg-blue-950 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-800 shadow-xl active:scale-95">Ingresar al Recinto</button>
           </form>
           
           <div className="mt-8 flex items-center justify-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
              <Wifi size={12} className="animate-pulse" /> Conectado al Servidor BOP20
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-['Inter'] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-[#0F172A] flex flex-col transition-all duration-300 z-50 shadow-2xl`}>
        <div className="h-24 flex items-center px-8 border-b border-white/5">
           <img src={SYMBOLS.logoBop20} className="h-12 rounded-full" />
           {!isSidebarCollapsed && <span className="ml-4 font-black text-white text-sm uppercase tracking-tighter">BOP 20 Puerto Esperanza</span>}
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
           <MenuButton id="home" label="Inicio" icon={<Home size={20}/>} active={activeTab} onClick={setActiveTab} />
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mt-6 mb-2">Sesión</p>
           <MenuButton id="attendance" label="Asistencia" icon={<Calendar size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="recinto" label="Recinto" icon={<Landmark size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="voting" label="Escrutinio" icon={<Vote size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="speaker_queue" label="Oradores" icon={<Mic2 size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="mociones" label="Mociones" icon={<FileText size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="historial" label="Actas" icon={<History size={20}/>} active={activeTab} onClick={setActiveTab} />
        </nav>

        <div className="p-6 bg-slate-950 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs">{currentUser?.nombre[0]}</div>
              {!isSidebarCollapsed && (
                <div className="truncate w-32">
                   <p className="text-[10px] font-black text-white uppercase truncate">{currentUser?.nombre} {currentUser?.apellido}</p>
                   <p className="text-[8px] font-bold text-slate-500 uppercase truncate">{currentUser?.cargo}</p>
                </div>
              )}
           </div>
           <button onClick={() => window.location.reload()} className="text-slate-500 hover:text-red-500"><LogOut size={18}/></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between z-40">
           <div className="flex items-center gap-6">
              <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 text-slate-400 hover:text-slate-900"><Menu size={22}/></button>
              
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${appState.sessionActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                 <div className={`w-2 h-2 rounded-full ${appState.sessionActive ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                 {appState.sessionActive ? 'SESIÓN ABIERTA' : 'SALA CERRADA'}
              </div>

              {appState.sessionActive && currentSpeaker && (
                <div className="flex items-center gap-3 bg-blue-900 text-white px-4 py-1.5 rounded-full shadow-lg animate-bounce">
                   <Mic2 size={14} className="text-red-400" />
                   <span className="text-[9px] font-black uppercase tracking-widest">ORADOR: {currentSpeaker.nombre}</span>
                </div>
              )}
           </div>

           <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-slate-400 mr-4" title="Dispositivos conectados">
                 <Users2 size={16} />
                 <span className="text-[10px] font-black">{connectedPeers}</span>
              </div>
              {isPresident && (
                <button onClick={toggleSession} className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:translate-y-1 transition-all ${appState.sessionActive ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                   {appState.sessionActive ? 'Levantar Sesión' : 'Abrir Sesión'}
                </button>
              )}
              <img src={SYMBOLS.logoBop20} className="h-10 w-10 rounded-full border border-slate-200 object-cover" />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
           <div className="max-w-6xl mx-auto pb-12">
             {activeTab === 'home' && <HomeModule user={currentUser!} appState={appState} setActiveTab={setActiveTab} isPresident={isPresident} handlePedirPalabra={handlePedirPalabra} hasQuorum={hasQuorum} />}
             {activeTab === 'attendance' && <AttendanceModule users={appState.users} isPresident={isPresident} handleToggleAttendance={handleToggleAttendance} hasQuorum={hasQuorum} presentCount={presentCount} />}
             {activeTab === 'recinto' && <RecintoModule users={appState.users} appState={appState} />}
             {activeTab === 'voting' && <VotingModule appState={appState} currentUser={currentUser!} handleVote={handleVote} isPresident={isPresident} />}
             {activeTab === 'speaker_queue' && <SpeakerQueueModule appState={appState} isPresident={isPresident} handleCederPalabra={handleCederPalabra} currentUser={currentUser!} handlePedirPalabra={handlePedirPalabra} />}
             {activeTab === 'mociones' && <MocionesModule appState={appState} isPresident={isPresident} />}
             {activeTab === 'historial' && <HistoryModule resolutions={appState.historialResoluciones} />}
           </div>
        </div>
      </main>
    </div>
  );
}

// Componentes Auxiliares
function MenuButton({ id, label, icon, active, onClick }: any) {
    return (
        <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${active === id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

function HomeModule({ user, appState, setActiveTab, isPresident, handlePedirPalabra, hasQuorum }: any) {
    const isWaiting = appState.waitingList.includes(user.id);
    return (
        <div className="space-y-8 animate-in">
           <div className="bg-[#0F172A] text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                 <Landmark size={200} />
              </div>
              <div className="relative z-10">
                <p className="text-blue-400 font-black uppercase text-[10px] tracking-[0.4em] mb-4">Bienvenido al Sistema Digital</p>
                <h2 className="text-6xl font-black uppercase tracking-tighter leading-none mb-6">{user.nombre} {user.apellido}</h2>
                <div className="flex gap-4">
                    <span className="px-4 py-1.5 bg-blue-700 rounded-full text-[9px] font-black uppercase">{user.cargo}</span>
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${appState.sessionActive ? 'bg-green-600' : 'bg-red-600'}`}>
                        {appState.sessionActive ? 'Sesión en Curso' : 'Recinto en Receso'}
                    </span>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <ActionCard icon={<Mic2 size={24}/>} label={isWaiting ? "Cancelar Palabra" : "Pedir Palabra"} color="bg-blue-600" onClick={handlePedirPalabra} />
              <ActionCard icon={<Vote size={24}/>} label="Votaciones" color="bg-amber-600" onClick={() => setActiveTab('voting')} />
              <ActionCard icon={<Calendar size={24}/>} label="Asistencia" color="bg-emerald-600" onClick={() => setActiveTab('attendance')} />
              <ActionCard icon={<FileText size={24}/>} label="Nueva Moción" color="bg-slate-700" onClick={() => setActiveTab('mociones')} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] border shadow-lg space-y-4">
                 <h3 className="text-xl font-black uppercase flex items-center gap-3"><Users2 size={24} className="text-blue-600"/> Quórum</h3>
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-4xl font-black">{appState.users.filter(u => u.confirmado).length} / {appState.users.length}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Delegados Acreditados</p>
                    </div>
                    <div className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] ${hasQuorum ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                       {hasQuorum ? 'HAY QUÓRUM' : 'FALTA QUÓRUM'}
                    </div>
                 </div>
              </div>
              <div className="bg-white p-10 rounded-[2.5rem] border shadow-lg flex items-center gap-8">
                 {/* Fix: Using Clock icon now properly imported from lucide-react */}
                 <div className="bg-slate-50 p-6 rounded-3xl"><Clock size={40} className="text-slate-400" /></div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inicio de Sesión</p>
                    <p className="text-3xl font-black uppercase">{appState.sessionStartTime || '--:--'}</p>
                 </div>
              </div>
           </div>
        </div>
    );
}

function ActionCard({ icon, label, color, onClick }: any) {
    return (
        <button onClick={onClick} className={`${color} text-white p-8 rounded-[2rem] shadow-xl flex flex-col items-center justify-center gap-4 hover:scale-105 active:scale-95 transition-all group`}>
           <div className="group-hover:scale-110 transition-transform">{icon}</div>
           <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        </button>
    );
}

function AttendanceModule({ users, isPresident, handleToggleAttendance, hasQuorum, presentCount }: any) {
    return (
        <div className="space-y-8 animate-in">
           <div className={`p-10 rounded-[3rem] border-4 transition-all ${hasQuorum ? 'bg-quorum-active border-sky-200' : 'bg-white border-slate-100'}`}>
              <h3 className="text-5xl font-black uppercase tracking-tighter">Asistencia Nominal</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{presentCount} Delegados presentes de {users.length}</p>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {users.map((u: User) => (
                 <div key={u.id} className={`p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center text-center ${u.confirmado ? 'bg-white border-green-500 shadow-xl' : 'bg-slate-50 border-transparent grayscale opacity-50'}`}>
                    <div className={`w-20 h-20 rounded-2xl mb-4 flex items-center justify-center text-3xl font-black ${u.confirmado ? 'bg-green-50 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                       {u.nombre[0]}
                    </div>
                    <p className="font-black uppercase text-lg leading-tight">{u.nombre}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mb-6 tracking-widest">{u.cargo}</p>
                    {isPresident && (
                       <button onClick={() => handleToggleAttendance(u.id)} className={`w-full py-3 rounded-xl font-black uppercase text-[8px] tracking-widest border-b-4 active:border-b-0 transition-all ${u.confirmado ? 'bg-red-500 text-white border-red-800' : 'bg-green-600 text-white border-green-800'}`}>
                          {u.confirmado ? 'Baja' : 'Acreditar'}
                       </button>
                    )}
                 </div>
              ))}
           </div>
        </div>
    );
}

function VotingModule({ appState, currentUser, handleVote, isPresident }: any) {
    const stats = useMemo(() => {
        const s = { YES: 0, NO: 0, ABS: 0, TOTAL: 0 };
        appState.users.filter(u => u.confirmado).forEach(u => {
            if (u.votoActual === 'YES') s.YES++;
            else if (u.votoActual === 'NO') s.NO++;
            else if (u.votoActual === 'ABSTAIN') s.ABS++;
            if (u.votoActual) s.TOTAL++;
        });
        return s;
    }, [appState.users]);

    if (!appState.sessionActive) return (
        <div className="py-40 text-center opacity-20">
            <Lock size={100} className="mx-auto mb-8" />
            <h3 className="text-4xl font-black uppercase italic">Votación Bloqueada</h3>
            <p className="text-xs font-bold uppercase tracking-[0.5em]">Debe abrirse la sesión para habilitar el sufragio</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in">
           <div className="bg-slate-900 text-white p-12 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 border-b-[15px] border-black">
              <div className="flex-1 text-center md:text-left">
                 <h4 className="text-blue-400 font-black uppercase text-[10px] tracking-widest mb-2">Asunto en Tratamiento:</h4>
                 <h2 className="text-5xl font-black uppercase tracking-tighter italic">"{appState.activeVote?.asunto || 'CONSULTA GENERAL'}"</h2>
              </div>
              <div className="flex gap-4">
                 <VoteStat count={stats.YES} label="A Favor" color="text-green-500" />
                 <VoteStat count={stats.NO} label="En Contra" color="text-red-500" />
                 <VoteStat count={stats.ABS} label="Abstenciones" color="text-slate-400" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-12 rounded-[3rem] border shadow-xl flex flex-col items-center justify-center text-center">
                 <h3 className="text-4xl font-black uppercase tracking-tighter mb-10 italic">Emitir Voto Nominal</h3>
                 <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
                    <VoteButton label="Afirmativo" color="bg-green-600" onClick={() => handleVote('YES')} active={currentUser.votoActual === 'YES'} />
                    <VoteButton label="Negativo" color="bg-red-600" onClick={() => handleVote('NO')} active={currentUser.votoActual === 'NO'} />
                    <VoteButton label="Abstención" color="bg-slate-500" onClick={() => handleVote('ABSTAIN')} active={currentUser.votoActual === 'ABSTAIN'} />
                 </div>
              </div>
              
              <div className="bg-[#020617] p-12 rounded-[3rem] border shadow-xl">
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 text-center">Tablero en Tiempo Real</h3>
                 <div className="grid grid-cols-8 gap-2">
                    {appState.users.filter(u => u.confirmado).map(u => (
                        <div key={u.id} className={`w-full aspect-square rounded-lg transition-all duration-1000 ${u.votoActual === 'YES' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : u.votoActual === 'NO' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : u.votoActual === 'ABSTAIN' ? 'bg-slate-500' : 'bg-slate-800'}`} title={u.nombre} />
                    ))}
                 </div>
              </div>
           </div>
        </div>
    );
}

function VoteStat({ count, label, color }: any) {
    return (
        <div className="bg-slate-800 p-6 rounded-3xl min-w-[120px] text-center border border-white/5">
            <p className={`text-[8px] font-black uppercase mb-1 ${color}`}>{label}</p>
            <p className="text-5xl font-black text-white">{count}</p>
        </div>
    );
}

function VoteButton({ label, color, onClick, active }: any) {
    return (
        <button onClick={onClick} className={`w-full py-6 rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl border-b-[8px] active:border-b-0 transition-all ${active ? 'bg-white text-slate-900 border-slate-200' : `${color} text-white border-black/20 hover:brightness-125`}`}>
            {label}
        </button>
    );
}

function RecintoModule({ users, appState }: any) {
    return (
        <div className="bg-[#020617] p-20 rounded-[4rem] shadow-2xl min-h-[700px] flex flex-col items-center justify-center relative overflow-hidden border-b-[30px] border-black animate-in">
           <div className="w-[400px] h-40 bg-white border-b-[20px] border-slate-800 rounded-t-[100px] flex flex-col items-center justify-center text-slate-950 shadow-3xl relative z-20">
              <img src={SYMBOLS.logoBop20} className="h-20 mb-2 rounded-full" />
              <span className="text-sm font-black uppercase tracking-[0.8em] opacity-30">Presidencia</span>
           </div>
           
           <div className="mt-20 flex flex-wrap justify-center gap-4 max-w-4xl">
              {users.map((u: User) => (
                 <div key={u.id} className={`w-10 h-10 rounded-full border-2 transition-all duration-1000 ${u.confirmado ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-slate-800 border-slate-700'} ${appState.speakerId === u.id ? 'scale-150 z-30 ring-4 ring-red-500 animate-pulse' : ''}`} title={u.nombre} />
              ))}
           </div>
        </div>
    );
}

function SpeakerQueueModule({ appState, isPresident, handleCederPalabra, currentUser, handlePedirPalabra }: any) {
    const isWaiting = appState.waitingList.includes(currentUser.id);
    return (
        <div className="space-y-8 animate-in">
           <div className="bg-slate-900 text-white p-16 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between border-b-[15px] border-blue-900 relative overflow-hidden group gap-8">
              <div className="flex items-center gap-10 relative z-10">
                 <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${appState.speakerId ? 'bg-red-700 animate-pulse' : 'bg-slate-800'}`}>
                    <Mic2 size={40} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-1">EN USO DE LA PALABRA:</p>
                    <h3 className="text-5xl font-black uppercase tracking-tighter">{appState.speakerId ? appState.users.find(u => u.id === appState.speakerId)?.nombre : 'SILENCIO'}</h3>
                 </div>
              </div>
              {isPresident && appState.speakerId && (
                <button onClick={() => handleCederPalabra(null)} className="bg-red-600 px-10 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-700 transition-all relative z-10">Finalizar Orador</button>
              )}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[3rem] border shadow-lg">
                 <h3 className="text-xl font-black uppercase mb-8 border-b pb-4">Lista de Espera</h3>
                 <div className="space-y-3">
                    {appState.waitingList.map((id, idx) => {
                       const u = appState.users.find(usr => usr.id === id);
                       return (
                        <div key={id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border hover:border-blue-600 transition-all group">
                           <div className="flex items-center gap-4">
                              <span className="text-2xl font-black text-slate-300 group-hover:text-blue-600">#{idx+1}</span>
                              <span className="font-black uppercase text-sm">{u?.nombre}</span>
                           </div>
                           {isPresident && (
                              <button onClick={() => handleCederPalabra(id)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-[8px] uppercase tracking-widest shadow-md">Ceder Palabra</button>
                           )}
                        </div>
                       );
                    })}
                    {appState.waitingList.length === 0 && <p className="text-center py-10 text-slate-300 font-black uppercase italic tracking-widest">Sin pedidos de palabra</p>}
                 </div>
              </div>

              <div className="flex items-center justify-center bg-white p-10 rounded-[3rem] border shadow-lg">
                 <button 
                  onClick={handlePedirPalabra}
                  className={`w-64 h-64 rounded-[3rem] flex flex-col items-center justify-center transition-all shadow-2xl border-b-[15px] active:border-b-0 active:translate-y-4 ${isWaiting ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-900 text-white border-black'}`}
                 >
                    <Mic2 size={80} className="mb-4" />
                    <span className="text-[12px] font-black uppercase tracking-widest">{isWaiting ? 'CANCELAR' : 'PEDIR PALABRA'}</span>
                 </button>
              </div>
           </div>
        </div>
    );
}

function MocionesModule({ appState, isPresident }: any) { return <div className="py-20 text-center opacity-20"><FileText size={100} className="mx-auto mb-8"/><h3 className="text-3xl font-black uppercase italic">Módulo de Mociones</h3><p className="text-[10px] font-bold uppercase tracking-widest">Registros guardados en Nube BOP20</p></div>; }
function HistoryModule({ resolutions }: any) { return <div className="py-20 text-center opacity-20"><History size={100} className="mx-auto mb-8"/><h3 className="text-3xl font-black uppercase italic">Archivo de Actas</h3><p className="text-[10px] font-bold uppercase tracking-widest">Historial oficial BOP20</p></div>; }

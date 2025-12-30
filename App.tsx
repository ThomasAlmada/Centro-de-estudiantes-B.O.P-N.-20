
import React, { useState, useMemo, useEffect } from 'react';
import { Role, User, Moción, AppState, VoteType, VoteSession, ArchivedResolution, NewsItem } from './types';
import { INITIAL_USERS, INITIAL_NEWS } from './constants';
import { 
  Users, Vote, Calendar, LogOut, Menu, Mic2, FileText, 
  Landmark, Home, History, Clock, Activity, Cpu, Shield, Lock, 
  CheckCircle, Inbox, Wifi, Users2
} from 'lucide-react';
import Gun from 'gun';

// Inicialización de Gun con relays internacionales para sincronización total
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun'
  ],
  localStorage: true // Persistencia local ante caídas de red
});

// Espacio de nombres único para el Centro de Estudiantes BOP 20
const APP_NAMESPACE = 'BOP20_CENTRO_ESTUDIANTES_GLOBAL_V3';
const db = gun.get(APP_NAMESPACE);

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dniInput, setDniInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing'>('syncing');

  // Estado Maestro Sincronizado
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

  // --- SINCRONIZACIÓN CON EL BACKEND EN TIEMPO REAL ---
  useEffect(() => {
    // 1. Escuchar Estado de la Sesión (Recinto Abierto/Cerrado)
    db.get('session_config').on((data) => {
      if (!data) return;
      setAppState(prev => ({
        ...prev,
        sessionActive: !!data.active,
        sessionStartTime: data.startTime || null,
        speakerId: data.speakerId || null,
        activeVote: data.activeVote ? JSON.parse(data.activeVote) : null
      }));
      setSyncStatus('online');
    });

    // 2. Escuchar Lista de Espera de Oradores (Global)
    db.get('speaker_queue').on((data) => {
      if (!data) return;
      const list = Object.keys(data)
        .filter(key => key !== '_' && data[key] === true);
      setAppState(prev => ({ ...prev, waitingList: list }));
    });

    // 3. Escuchar Registro de Usuarios (Asistencia y Votos)
    INITIAL_USERS.forEach(u => {
      db.get('registry').get('users').get(u.id).on((data) => {
        if (!data) return;
        setAppState(prev => ({
          ...prev,
          users: prev.users.map(usr => 
            usr.id === u.id ? { 
              ...usr, 
              confirmado: data.confirmado ?? usr.confirmado, 
              votoActual: data.votoActual || null 
            } : usr
          )
        }));
      });
    });

    return () => {
      db.get('session_config').off();
      db.get('speaker_queue').off();
    };
  }, []);

  // --- ACCIONES DE PODER (SOLO PRESIDENTE) ---
  const isPresident = currentUser?.dni === '49993070';

  const toggleSession = () => {
    if (!isPresident) return;
    const newState = !appState.sessionActive;
    
    db.get('session_config').put({
      active: newState,
      startTime: newState ? new Date().toLocaleTimeString('es-AR') : null,
      speakerId: null,
      activeVote: null
    });

    // Limpiar votos y cola si se cierra la sesión
    if (!newState) {
      db.get('speaker_queue').put(null);
      appState.users.forEach(u => {
        db.get('registry').get('users').get(u.id).put({ votoActual: null });
      });
    }
  };

  const setAsuntoVotacion = (asunto: string) => {
    if (!isPresident || !asunto) return;
    const voteSession: VoteSession = {
      activa: true,
      asunto: asunto.toUpperCase(),
      resolucionNro: `RES-${Math.floor(Math.random() * 1000)}`,
      inicio: new Date().toISOString()
    };
    db.get('session_config').put({ activeVote: JSON.stringify(voteSession) });
  };

  const handleCederPalabra = (userId: string | null) => {
    if (!isPresident) return;
    db.get('session_config').put({ speakerId: userId });
    if (userId) {
      db.get('speaker_queue').get(userId).put(false);
    }
  };

  // --- ACCIONES DE USUARIO ---
  const handlePedirPalabra = () => {
    if (!currentUser || !appState.sessionActive) return;
    const isWaiting = appState.waitingList.includes(currentUser.id);
    db.get('speaker_queue').get(currentUser.id).put(!isWaiting);
  };

  const handleVote = (vote: VoteType) => {
    if (!currentUser || !appState.sessionActive || !appState.activeVote) return;
    db.get('registry').get('users').get(currentUser.id).put({ votoActual: vote });
  };

  const handleToggleAttendance = (userId: string) => {
    if (!isPresident) return;
    const user = appState.users.find(u => u.id === userId);
    db.get('registry').get('users').get(userId).put({ confirmado: !user?.confirmado });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = appState.users.find(u => u.dni === dniInput && dniInput === passInput);
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
    } else {
      alert('IDENTIFICACIÓN NO RECONOCIDA EN EL PADRÓN');
    }
  };

  // --- DERIVADOS DE ESTADO ---
  const currentSpeaker = useMemo(() => appState.users.find(u => u.id === appState.speakerId), [appState.users, appState.speakerId]);
  const presentCount = useMemo(() => appState.users.filter(u => u.confirmado).length, [appState.users]);
  const hasQuorum = presentCount > appState.users.length / 2;

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="bg-white p-12 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-md rounded-[3rem] text-center border-t-[14px] border-blue-900 z-10 animate-in">
           <img src="https://bop20.edu.ar/wp-content/uploads/cropped-LOGO-BOP20-2023-126x130.jpg" alt="Logo" className="h-32 mx-auto mb-8 rounded-full border-4 border-slate-50 shadow-xl" />
           <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter mb-1">B.O.P. Nº 20</h1>
           <p className="text-[10px] font-bold text-blue-800 uppercase tracking-[0.4em] mb-10 opacity-70">SISTEMA LEGISLATIVO CENTRALIZADO</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" placeholder="DNI DEL DELEGADO" value={dniInput} onChange={e => setDniInput(e.target.value)} className="w-full bg-slate-50 p-6 font-black text-center rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-950 transition-all text-lg" />
              <input type="password" placeholder="CLAVE" value={passInput} onChange={e => setPassInput(e.target.value)} className="w-full bg-slate-50 p-6 font-black text-center rounded-2xl border-2 border-slate-100 outline-none focus:border-blue-950 transition-all text-lg" />
              <button className="w-full bg-blue-950 text-white p-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-blue-800 shadow-2xl active:scale-95 transition-all">Acceder al Sistema</button>
           </form>
           
           <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/50 py-3 rounded-xl">
              <Activity size={14} className="animate-pulse" /> Conectado al Backend Central
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-['Inter'] overflow-hidden">
      {/* Sidebar Elite */}
      <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-80'} bg-[#0F172A] flex flex-col transition-all duration-500 z-50 shadow-2xl`}>
        <div className="h-28 flex items-center px-8 border-b border-white/5 bg-slate-950/50">
           <img src="https://bop20.edu.ar/wp-content/uploads/cropped-LOGO-BOP20-2023-126x130.jpg" className="h-14 w-14 rounded-full border-2 border-white/20" />
           {!isSidebarCollapsed && (
             <div className="ml-4">
                <span className="block font-black text-white text-sm uppercase tracking-tighter">BOP 20</span>
                <span className="block text-[8px] font-bold text-blue-400 uppercase tracking-widest">Puerto Esperanza</span>
             </div>
           )}
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
           <MenuButton id="home" label="Inicio" icon={<Home size={20}/>} active={activeTab} onClick={setActiveTab} />
           <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] px-4 mt-8 mb-3">Parlamento</p>
           <MenuButton id="attendance" label="Asistencia" icon={<Calendar size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="recinto" label="Recinto" icon={<Landmark size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="voting" label="Votaciones" icon={<Vote size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="speaker_queue" label="Oradores" icon={<Mic2 size={20}/>} active={activeTab} onClick={setActiveTab} />
           <MenuButton id="mociones" label="Mociones" icon={<FileText size={20}/>} active={activeTab} onClick={setActiveTab} />
        </nav>

        <div className="p-6 bg-slate-950 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-lg">
                {currentUser?.nombre[0]}
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate w-32">
                   <p className="text-[10px] font-black text-white uppercase truncate">{currentUser?.nombre} {currentUser?.apellido}</p>
                   <p className="text-[8px] font-bold text-blue-400 uppercase truncate">{currentUser?.cargo}</p>
                </div>
              )}
           </div>
           <button onClick={() => window.location.reload()} className="p-2 bg-white/5 rounded-lg text-slate-500 hover:text-red-500 transition-colors">
             <LogOut size={20}/>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white/80 backdrop-blur-md border-b px-10 flex items-center justify-between z-40">
           <div className="flex items-center gap-8">
              <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                <Menu size={24}/>
              </button>
              
              <div className={`flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-black tracking-widest border-2 ${appState.sessionActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                 <div className={`w-2.5 h-2.5 rounded-full ${appState.sessionActive ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                 {appState.sessionActive ? 'SESIÓN OFICIAL ACTIVA' : 'SALA CERRADA'}
              </div>

              {appState.sessionActive && currentSpeaker && (
                <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-2.5 rounded-2xl shadow-xl animate-in">
                   <Mic2 size={16} className="text-rose-500" />
                   <div className="flex flex-col">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Delegado con la palabra:</span>
                     <span className="text-[10px] font-black uppercase tracking-tighter">{currentSpeaker.nombre} {currentSpeaker.apellido}</span>
                   </div>
                </div>
              )}
           </div>

           <div className="flex items-center gap-6">
              <div className={`flex items-center gap-2 ${syncStatus === 'online' ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                 <Cpu size={18} />
                 <span className="text-[10px] font-black uppercase tracking-widest">SYNC {syncStatus.toUpperCase()}</span>
              </div>
              
              {isPresident && (
                <button onClick={toggleSession} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:translate-y-1 transition-all ${appState.sessionActive ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-blue-950 text-white hover:bg-slate-800'}`}>
                   {appState.sessionActive ? 'Levantar Sesión' : 'Abrir Recinto'}
                </button>
              )}
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
           <div className="max-w-7xl mx-auto pb-16">
             {activeTab === 'home' && <HomeModule user={currentUser!} appState={appState} setActiveTab={setActiveTab} isPresident={isPresident} handlePedirPalabra={handlePedirPalabra} hasQuorum={hasQuorum} />}
             {activeTab === 'attendance' && <AttendanceModule users={appState.users} isPresident={isPresident} handleToggleAttendance={handleToggleAttendance} hasQuorum={hasQuorum} presentCount={presentCount} />}
             {activeTab === 'recinto' && <RecintoModule users={appState.users} appState={appState} />}
             {activeTab === 'voting' && <VotingModule appState={appState} currentUser={currentUser!} handleVote={handleVote} isPresident={isPresident} setAsuntoVotacion={setAsuntoVotacion} />}
             {activeTab === 'speaker_queue' && <SpeakerQueueModule appState={appState} isPresident={isPresident} handleCederPalabra={handleCederPalabra} currentUser={currentUser!} handlePedirPalabra={handlePedirPalabra} />}
           </div>
        </div>
      </main>
    </div>
  );
}

// --- SUBMODULOS REFACTORIZADOS ---

function MenuButton({ id, label, icon, active, onClick }: any) {
    const isActive = active === id;
    return (
        <button onClick={() => onClick(id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            {icon}
            <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

function HomeModule({ user, appState, setActiveTab, handlePedirPalabra, hasQuorum }: any) {
    const isWaiting = appState.waitingList.includes(user.id);
    return (
        <div className="space-y-10 animate-in">
           <div className="bg-[#0F172A] text-white p-16 rounded-[4rem] shadow-3xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 p-12 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                 <Landmark size={300} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="w-40 h-40 rounded-full border-8 border-white/10 overflow-hidden shadow-2xl">
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-6xl font-black">{user.nombre[0]}</div>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-blue-400 font-black uppercase text-xs tracking-[0.4em] mb-4">Bienvenido al Parlamento BOP 20</p>
                  <h2 className="text-7xl font-black uppercase tracking-tighter leading-none mb-6">{user.nombre} {user.apellido}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <span className="px-6 py-2 bg-blue-700/50 backdrop-blur-md rounded-xl text-[10px] font-black uppercase border border-white/10">{user.cargo}</span>
                      <span className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10 ${appState.sessionActive ? 'bg-emerald-600/50 text-emerald-200' : 'bg-rose-600/50 text-rose-200'}`}>
                          {appState.sessionActive ? 'Sesión en Curso' : 'Recinto en Receso'}
                      </span>
                  </div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <ActionCard icon={<Mic2 size={28}/>} label={isWaiting ? "Cancelar Palabra" : "Pedir Palabra"} color="bg-indigo-600" onClick={handlePedirPalabra} />
              <ActionCard icon={<Vote size={28}/>} label="Votaciones" color="bg-amber-600" onClick={() => setActiveTab('voting')} />
              <ActionCard icon={<Calendar size={28}/>} label="Acreditación" color="bg-emerald-600" onClick={() => setActiveTab('attendance')} />
              <ActionCard icon={<FileText size={28}/>} label="Nueva Moción" color="bg-slate-800" onClick={() => setActiveTab('mociones')} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-xl space-y-6">
                 <h3 className="text-2xl font-black uppercase flex items-center gap-4 text-slate-900"><Users size={32} className="text-blue-600"/> Estado del Quórum</h3>
                 <div className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem]">
                    <div>
                       <p className="text-6xl font-black tracking-tighter text-slate-900">{appState.users.filter(u => u.confirmado).length} <span className="text-2xl text-slate-300">/ {appState.users.length}</span></p>
                       <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Delegados Acreditados</p>
                    </div>
                    <div className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest ${hasQuorum ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 animate-pulse' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'}`}>
                       {hasQuorum ? 'HAY QUÓRUM' : 'FALTA QUÓRUM'}
                    </div>
                 </div>
              </div>
              <div className="bg-white p-12 rounded-[3.5rem] border-2 border-slate-100 shadow-xl flex items-center gap-10">
                 <div className="bg-slate-950 p-8 rounded-[2rem] text-white shadow-2xl"><Clock size={50} /></div>
                 <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Reloj de Sesión</p>
                    <p className="text-5xl font-black uppercase tracking-tighter text-slate-900">{appState.sessionStartTime || '--:--'}</p>
                 </div>
              </div>
           </div>
        </div>
    );
}

function ActionCard({ icon, label, color, onClick }: any) {
    return (
        <button onClick={onClick} className={`${color} text-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center gap-5 hover:scale-[1.05] active:scale-95 transition-all group`}>
           <div className="group-hover:rotate-12 transition-transform">{icon}</div>
           <span className="text-[11px] font-black uppercase tracking-[0.2em] text-center leading-tight">{label}</span>
        </button>
    );
}

function AttendanceModule({ users, isPresident, handleToggleAttendance, hasQuorum, presentCount }: any) {
    return (
        <div className="space-y-10 animate-in">
           <div className={`p-14 rounded-[4rem] border-4 transition-all shadow-3xl flex justify-between items-center ${hasQuorum ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-100'}`}>
              <div>
                <h3 className="text-6xl font-black uppercase tracking-tighter text-slate-900">Control de Asistencia</h3>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-3">Estado Nominal de los Delegados del Centro de Estudiantes</p>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border-2 border-slate-100">
                <p className="text-5xl font-black text-blue-600">{presentCount}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-widest">Acreditados</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {users.map((u: User) => (
                 <div key={u.id} className={`group p-10 rounded-[3rem] border-[3px] transition-all flex flex-col items-center text-center ${u.confirmado ? 'bg-white border-emerald-500 shadow-2xl' : 'bg-slate-100 border-transparent opacity-50 grayscale'}`}>
                    <div className={`w-28 h-28 rounded-[2rem] mb-6 flex items-center justify-center text-4xl font-black ${u.confirmado ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                       {u.nombre[0]}
                    </div>
                    <p className="font-black uppercase text-xl text-slate-900 leading-tight mb-1">{u.nombre}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-8 tracking-widest">{u.cargo}</p>
                    {isPresident && (
                       <button onClick={() => handleToggleAttendance(u.id)} className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest border-b-[8px] active:border-b-0 transition-all ${u.confirmado ? 'bg-rose-500 text-white border-rose-800' : 'bg-emerald-600 text-white border-emerald-800'}`}>
                          {u.confirmado ? 'DAR DE BAJA' : 'ACREDITAR'}
                       </button>
                    )}
                 </div>
              ))}
           </div>
        </div>
    );
}

function VotingModule({ appState, currentUser, handleVote, isPresident, setAsuntoVotacion }: any) {
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
        <div className="py-60 text-center text-slate-300">
            <Lock size={100} className="mx-auto mb-8" />
            <h3 className="text-5xl font-black uppercase italic tracking-tighter">Sufragio Bloqueado</h3>
            <p className="text-xs font-bold uppercase tracking-[0.5em]">Debe abrirse el recinto para habilitar votaciones</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in">
           <div className="bg-slate-950 text-white p-16 rounded-[4rem] shadow-3xl flex flex-col lg:flex-row justify-between items-center gap-12 border-b-[20px] border-blue-900 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-white to-rose-500 opacity-20"></div>
              <div className="flex-1 text-center lg:text-left">
                 <h4 className="text-blue-400 font-black uppercase text-xs tracking-[0.3em] mb-3">Expediente en Debate:</h4>
                 <h2 className="text-5xl font-black uppercase tracking-tighter italic leading-tight text-white/90">"{appState.activeVote?.asunto || 'EN ESPERA DE ASUNTO...'}"</h2>
                 {isPresident && !appState.activeVote && (
                    <div className="mt-8 flex gap-4">
                        <input id="voteAsunto" type="text" placeholder="Asunto del Voto..." className="bg-white/10 p-4 rounded-xl border border-white/20 outline-none focus:border-blue-500 text-sm font-bold w-64" />
                        <button onClick={() => setAsuntoVotacion((document.getElementById('voteAsunto') as HTMLInputElement).value)} className="bg-blue-600 px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500">Iniciar Votación</button>
                    </div>
                 )}
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                 <VoteStat count={stats.YES} label="Afirmativo" color="text-emerald-500" />
                 <VoteStat count={stats.NO} label="Negativo" color="text-rose-500" />
                 <VoteStat count={stats.ABS} label="Abstención" color="text-slate-400" />
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-14 rounded-[4rem] border-2 border-slate-100 shadow-2xl flex flex-col items-center justify-center text-center">
                 <h3 className="text-4xl font-black uppercase tracking-tighter mb-12 italic text-slate-800">Su voto, Sr. Delegado</h3>
                 <div className="grid grid-cols-1 gap-6 w-full max-w-sm">
                    <VoteButton label="Afirmativo (Sí)" color="bg-emerald-600" onClick={() => handleVote('YES')} active={currentUser.votoActual === 'YES'} />
                    <VoteButton label="Negativo (No)" color="bg-rose-600" onClick={() => handleVote('NO')} active={currentUser.votoActual === 'NO'} />
                    <VoteButton label="Abstención" color="bg-slate-600" onClick={() => handleVote('ABSTAIN')} active={currentUser.votoActual === 'ABSTAIN'} />
                 </div>
              </div>
              
              <div className="bg-[#020617] p-14 rounded-[4rem] shadow-3xl border-t-8 border-slate-800">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 text-center">Monitor Parlamentario en Tiempo Real</h3>
                 <div className="grid grid-cols-8 gap-3">
                    {appState.users.filter(u => u.confirmado).map(u => (
                        <div key={u.id} className={`w-full aspect-square rounded-[1rem] transition-all duration-1000 transform ${u.votoActual === 'YES' ? 'bg-emerald-500 shadow-[0_0_20px_#10b981]' : u.votoActual === 'NO' ? 'bg-rose-500 shadow-[0_0_20px_#f43f5e]' : u.votoActual === 'ABSTAIN' ? 'bg-slate-500' : 'bg-slate-800 ring-2 ring-slate-700/50'}`} title={u.nombre} />
                    ))}
                    {Array.from({length: 32 - appState.users.filter(u => u.confirmado).length}).map((_, i) => (
                        <div key={i} className="w-full aspect-square rounded-[1rem] bg-slate-900 border border-white/5 opacity-20" />
                    ))}
                 </div>
              </div>
           </div>
        </div>
    );
}

function VoteStat({ count, label, color }: any) {
    return (
        <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] min-w-[150px] text-center border border-white/10 shadow-2xl">
            <p className={`text-[10px] font-black uppercase mb-2 ${color} tracking-widest`}>{label}</p>
            <p className="text-6xl font-black text-white tracking-tighter">{count}</p>
        </div>
    );
}

function VoteButton({ label, color, onClick, active }: any) {
    return (
        <button onClick={onClick} className={`w-full py-8 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl border-b-[10px] active:border-b-0 active:translate-y-2 transition-all ${active ? 'bg-white text-slate-900 border-slate-300' : `${color} text-white border-black/30 hover:brightness-125`}`}>
            {label}
        </button>
    );
}

function RecintoModule({ users, appState }: any) {
    return (
        <div className="bg-[#020617] p-24 rounded-[5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] min-h-[800px] flex flex-col items-center justify-start relative overflow-hidden border-b-[40px] border-slate-950 animate-in">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]"></div>
           
           <div className="w-[500px] h-48 bg-white border-b-[24px] border-slate-800 rounded-t-[140px] flex flex-col items-center justify-center text-slate-950 shadow-[0_-20px_50px_rgba(255,255,255,0.1)] relative z-20">
              <img src="https://bop20.edu.ar/wp-content/uploads/cropped-LOGO-BOP20-2023-126x130.jpg" className="h-20 mb-3 rounded-full border-2 border-slate-100" />
              <span className="text-sm font-black uppercase tracking-[0.8em] text-blue-900 opacity-60">Presidencia del Centro</span>
           </div>
           
           <div className="mt-32 flex flex-wrap justify-center gap-8 max-w-6xl relative z-10">
              {users.map((u: User) => (
                 <div key={u.id} className="relative group">
                    <div 
                      className={`w-14 h-14 rounded-full border-4 transition-all duration-1000 ${u.confirmado ? 'bg-white border-white shadow-[0_0_25px_rgba(255,255,255,0.5)]' : 'bg-slate-900 border-slate-800 opacity-30'} ${appState.speakerId === u.id ? 'scale-150 z-30 ring-4 ring-rose-500 animate-pulse' : ''}`} 
                    />
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[7px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {u.nombre}
                    </div>
                 </div>
              ))}
           </div>
        </div>
    );
}

function SpeakerQueueModule({ appState, isPresident, handleCederPalabra, currentUser, handlePedirPalabra }: any) {
    const isWaiting = appState.waitingList.includes(currentUser.id);
    return (
        <div className="space-y-10 animate-in">
           <div className="bg-slate-950 text-white p-20 rounded-[4rem] shadow-3xl flex flex-col md:flex-row items-center justify-between border-b-[20px] border-indigo-900 relative overflow-hidden group gap-12">
              <div className="flex items-center gap-12 relative z-10">
                 <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all shadow-2xl ${appState.speakerId ? 'bg-rose-700 animate-pulse' : 'bg-slate-800 border-2 border-white/5'}`}>
                    <Mic2 size={50} />
                 </div>
                 <div className="text-center md:text-left">
                    <p className="text-[11px] font-black uppercase opacity-40 tracking-[0.4em] mb-3">Orador en el estrado:</p>
                    <h3 className="text-6xl font-black uppercase tracking-tighter text-white/90 leading-none">{appState.speakerId ? appState.users.find(u => u.id === appState.speakerId)?.nombre : 'SILENCIO EN SALA'}</h3>
                 </div>
              </div>
              {isPresident && appState.speakerId && (
                <button onClick={() => handleCederPalabra(null)} className="bg-rose-600 px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl active:translate-y-2 transition-all relative z-10">Finalizar Orador</button>
              )}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-14 rounded-[4rem] border-2 border-slate-100 shadow-2xl">
                 <h3 className="text-2xl font-black uppercase mb-10 border-b-2 border-slate-50 pb-6 text-slate-800 flex items-center gap-4"><Users size={28}/> Lista de Espera</h3>
                 <div className="space-y-4">
                    {appState.waitingList.map((id, idx) => {
                       const u = appState.users.find(usr => usr.id === id);
                       return (
                        <div key={id} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-600 transition-all group">
                           <div className="flex items-center gap-8">
                              <span className="text-4xl font-black text-slate-200 group-hover:text-indigo-600 transition-colors">#{idx+1}</span>
                              <div className="flex flex-col">
                                <span className="font-black uppercase text-lg text-slate-800 tracking-tight">{u?.nombre}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u?.cargo}</span>
                              </div>
                           </div>
                           {isPresident && (
                              <button onClick={() => handleCederPalabra(id)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Ceder Palabra</button>
                           )}
                        </div>
                       );
                    })}
                    {appState.waitingList.length === 0 && <div className="py-20 text-center opacity-30"><Inbox size={64} className="mx-auto mb-6" /><p className="text-slate-400 font-black uppercase italic tracking-[0.3em]">Sin pedidos de palabra</p></div>}
                 </div>
              </div>

              <div className="flex flex-col items-center justify-center bg-white p-14 rounded-[4rem] border-2 border-slate-100 shadow-2xl">
                 <button 
                  onClick={handlePedirPalabra}
                  disabled={!appState.sessionActive}
                  className={`w-72 h-72 rounded-[3.5rem] flex flex-col items-center justify-center transition-all duration-500 shadow-3xl border-b-[18px] active:border-b-0 active:translate-y-4 disabled:opacity-20 ${isWaiting ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-900 text-white border-black'}`}
                 >
                    <Mic2 size={100} className={`mb-6 ${isWaiting ? 'animate-pulse' : ''}`} />
                    <span className="text-[14px] font-black uppercase tracking-[0.3em]">{isWaiting ? 'CANCELAR' : 'PEDIR PALABRA'}</span>
                 </button>
                 {!appState.sessionActive && <p className="mt-8 text-[10px] font-black text-rose-500 uppercase tracking-widest">Requiere Sesión Abierta</p>}
              </div>
           </div>
        </div>
    );
}

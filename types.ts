
export enum Role {
  PRESIDENTE_TITULAR = 'Presidente Titular',
  PRESIDENTE_SUPLENTE = 'Presidente Suplente',
  VICEPRESIDENTE_TITULAR = 'Vicepresidente Titular',
  VICEPRESIDENTE_SUPLENTE = 'Vicepresidente Suplente',
  PRIMER_REEMPLAZO_TITULAR = 'Primer Reemplazo Titular',
  PRIMER_REEMPLAZO_SUPLENTE = 'Primer Reemplazo Suplente',
  SEGUNDO_REEMPLAZO_TITULAR = 'Segundo Reemplazo Titular',
  SEGUNDO_REEMPLAZO_SUPLENTE = 'Segundo Reemplazo Suplente',
  SECRETARIO_GENERAL_TITULAR = 'Secretario General Titular',
  SECRETARIO_GENERAL_SUPLENTE = 'Secretario General Suplente',
  TESORERO_TITULAR = 'Tesorero Titular',
  TESORERO_SUPLENTE = 'Tesorero Suplente',
  VOCAL_TITULAR = 'Vocal Titular',
  VOCAL_SUPLENTE = 'Vocal Suplente',
  PROFESOR_ASESOR_TITULAR = 'Profesor Asesor Titular',
  PROFESOR_ASESOR_SUPLENTE = 'Profesor Asesor Suplente',
  JEFE_SECRETARIAS_TITULAR = 'Jefe de Secretarías Titular',
  JEFE_SECRETARIAS_SUPLENTE = 'Jefe de Secretarías Suplente',
  SECRETARIO_ACTAS_TITULAR = 'Secretario de Actas Titular',
  SECRETARIO_ACTAS_SUPLENTE = 'Secretario de Actas Suplente',
  SECRETARIA_CULTURA_TITULAR = 'Secretaría de Cultura Titular',
  SECRETARIA_CULTURA_SUPLENTE = 'Secretaría de Cultura Suplente',
  SECRETARIA_DERECHO_ESTUDIANTIL_TITULAR = 'Secretaría de Derecho Estudiantil Titular',
  SECRETARIA_DERECHO_ESTUDIANTIL_SUPLENTE = 'Secretaría de Derecho Estudiantil Suplente',
  SECRETARIA_DEPORTES_TITULAR = 'Secretaría de Deportes Titular',
  SECRETARIA_DEPORTES_SUPLENTE = 'Secretaría de Deportes Suplente',
  SECRETARIA_FINANZAS_TITULAR = 'Secretaría de Finanzas Titular',
  SECRETARIA_FINANZAS_SUPLENTE = 'Secretaría de Finanzas Suplente',
  SECRETARIA_FESTEJO_TITULAR = 'Secretaría de Festejo Titular',
  SECRETARIA_FESTEJO_SUPLENTE = 'Secretaría de Festejo Suplente',
  SECRETARIA_PRENSA_TITULAR = 'Secretaría de Prensa Titular',
  SECRETARIA_PRENSA_SUPLENTE = 'Secretaría de Prensa Suplente',
  SECRETARIA_RELACIONES_EXTERIORES_TITULAR = 'Secretaría de Relaciones Exteriores Titular',
  SECRETARIA_RELACIONES_EXTERIORES_SUPLENTE = 'Secretaría de Relaciones Exteriores Suplente',
  DELEGADO = 'Delegado'
}

export type VoteType = 'YES' | 'NO' | 'ABSTAIN' | null;

export interface User {
  id: string;
  dni: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cargo: Role;
  curso: string;
  confirmado: boolean; 
  votoActual: VoteType;
  pedirPalabra: 'NINGUNO' | 'ESPERA' | 'CONCEDIDA';
  activo: boolean;
  banca?: number;
}

export interface NewsItem {
  id: string;
  titulo: string;
  contenido: string;
  imagen?: string;
  fecha: string;
  autor: string;
  categoria: 'OFICIAL' | 'EVENTO' | 'URGENTE';
}

export interface Moción {
  id: string;
  titulo: string;
  descripcion: string;
  proponente: string;
  estado: 'PENDIENTE' | 'DEBATE' | 'APROBADA' | 'RECHAZADA' | 'ARCHIVADA';
  fecha: string;
}

export interface ArchivedResolution {
  id: string;
  asunto: string;
  fecha: string;
  resultado: 'APROBADA' | 'RECHAZADA' | 'ARCHIVADA';
  textoLegal: string;
  votosDetalle: { nombreCompleto: string, voto: string }[];
}

export interface SessionRecord {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  presentes: string[];
  ausentes: string[];
  acciones: string[];
  resoluciones: string[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  usuario: string;
  accion: string;
  nivel: 'INFO' | 'WARN' | 'CRITIC';
}

export interface VoteSession {
  activa: boolean;
  asunto: string;
  resolucionNro: string;
  inicio: string;
  mociónId?: string;
}

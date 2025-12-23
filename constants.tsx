
import { Role, User, NewsItem } from './types';

// Fix: Corrected pedirPalabra type and removed properties not present in the User interface
export const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    dni: '49993070',
    nombre: 'PRESIDENCIA',
    apellido: 'CENTRAL',
    email: 'presidencia@bop20.edu.ar',
    telefono: '3757000000',
    // Fix: Property 'PRESIDENTE' does not exist on type 'typeof Role'. Using 'PRESIDENTE_TITULAR' instead.
    cargo: Role.PRESIDENTE_TITULAR,
    curso: 'Institucional',
    confirmado: true,
    votoActual: null,
    pedirPalabra: 'NINGUNO',
    activo: true,
    banca: 0
  },
  {
    id: 'secgen',
    dni: '11111111',
    nombre: 'SECRETARÍA',
    apellido: 'GENERAL',
    email: 'secretaria@bop20.edu.ar',
    telefono: '3757111111',
    // Fix: Property 'SECRETARIO_GENERAL' does not exist on type 'typeof Role'. Using 'SECRETARIO_GENERAL_TITULAR' instead.
    cargo: Role.SECRETARIO_GENERAL_TITULAR,
    curso: '5º A',
    confirmado: false,
    votoActual: null,
    pedirPalabra: 'NINGUNO',
    activo: true,
    banca: 1
  }
];

export const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n1',
    titulo: 'INAUGURACIÓN DEL SISTEMA DIGITAL',
    contenido: 'Hoy marcamos un hito en el BOP 20 con la implementación de este sistema legislativo oficial.',
    fecha: '2024-06-10',
    autor: 'Prensa Institucional',
    categoria: 'OFICIAL',
    imagen: 'https://images.unsplash.com/photo-1541829070764-84a7d30dee62?auto=format&fit=crop&q=80&w=800'
  }
];

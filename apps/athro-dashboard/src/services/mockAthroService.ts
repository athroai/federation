import { Athro, AthroPersonality } from '../types/athro';

const mockAthros: Athro[] = [
  {
    id: '1',
    name: 'Professor Maxwell',
    subject: 'Physics',
    image: '/avatars/maxwell.jpg',
    specialties: ['Quantum Mechanics', 'Electromagnetism'],
  },
  {
    id: '2',
    name: 'Dr. Euclid',
    subject: 'Mathematics',
    image: '/avatars/euclid.jpg',
    specialties: ['Geometry', 'Number Theory'],
  },
];

const mockPersonalities: AthroPersonality[] = [
  {
    id: '1',
    name: 'Professor Maxwell',
    subject: 'Physics',
    level: 'University',
    teachingStyle: 'Analytical',
    specialCapabilities: ['Problem Solving', 'Visual Explanations'],
  },
  {
    id: '2',
    name: 'Dr. Euclid',
    subject: 'Mathematics',
    level: 'Advanced',
    teachingStyle: 'Systematic',
    specialCapabilities: ['Step-by-step Proofs', 'Geometric Visualization'],
  },
];

export const mockAthroService = {
  getCurrentAthro: () => mockAthros[0],
  getAllAthros: () => mockAthros,
  getAthroById: (id: string) => mockAthros.find(athro => athro.id === id),
  getPersonality: (id: string) => mockPersonalities.find(p => p.id === id),
};

import * as THREE from 'three';

export interface PlanetData {
  id: string;
  name: string;
  radius: number;
  distance: number;
  speed: number;
  rotationSpeed: number;
  color: string;
  emissive?: string;
  metalness?: number;
  roughness?: number;
  hasRings?: boolean;
  ringColor?: string;
  description: string;
  funFact: string;
  type: 'star' | 'rocky' | 'gas' | 'ice';
}

export const planets: PlanetData[] = [
  {
    id: 'sun',
    name: 'Sol',
    radius: 8,
    distance: 0,
    speed: 0,
    rotationSpeed: 0.0008,
    color: '#ffeb3b',
    emissive: '#ff9800',
    description: 'Our home star — a G-type main-sequence star',
    funFact: 'Contains 99.86% of the mass in the Solar System',
    type: 'star',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    radius: 2.2,
    distance: 28,
    speed: 0.008,
    rotationSpeed: 0.004,
    color: '#9e9e9e',
    description: 'The smallest and fastest planet',
    funFact: 'A day on Mercury lasts longer than its year',
    type: 'rocky',
  },
  {
    id: 'venus',
    name: 'Venus',
    radius: 3.8,
    distance: 42,
    speed: 0.006,
    rotationSpeed: -0.0015,
    color: '#e8b923',
    description: 'Earth’s evil twin with toxic atmosphere',
    funFact: 'Hottest planet in the Solar System (465°C)',
    type: 'rocky',
  },
  {
    id: 'earth',
    name: 'Earth',
    radius: 4.2,
    distance: 58,
    speed: 0.0045,
    rotationSpeed: 0.015,
    color: '#4a90e2',
    description: 'Our beautiful blue marble — the only planet known to harbor life',
    funFact: '71% of Earth’s surface is covered by water',
    type: 'rocky',
  },
  {
    id: 'mars',
    name: 'Mars',
    radius: 3.1,
    distance: 78,
    speed: 0.0032,
    rotationSpeed: 0.012,
    color: '#c45c26',
    description: 'The Red Planet — future home of humanity?',
    funFact: 'Olympus Mons is the tallest mountain in the Solar System',
    type: 'rocky',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    radius: 9.5,
    distance: 110,
    speed: 0.0018,
    rotationSpeed: 0.035,
    color: '#d4a373',
    description: 'King of planets — a gas giant with powerful storms',
    funFact: 'The Great Red Spot is a storm larger than Earth',
    type: 'gas',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    radius: 8.2,
    distance: 145,
    speed: 0.0012,
    rotationSpeed: 0.028,
    color: '#f4e8c1',
    hasRings: true,
    ringColor: '#e8d5a3',
    description: 'The jewel of the Solar System with spectacular rings',
    funFact: 'Saturn is the least dense planet — it would float in water',
    type: 'gas',
  },
];

export const BLACK_HOLE_POSITION = new THREE.Vector3(220, 15, -180);
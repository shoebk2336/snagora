import Dexie, { type Table } from 'dexie';

export interface Project {
  id: string;
  name: string;
  buildingName: string;
  pendingIssues: number;
  completedIssues: number;
  lastUpdated: number;
  offlineStatus: 'offline' | 'online';
  syncStatus: 'synced' | 'pending';
}

export interface Building {
  id: string;
  projectId: string;
  name: string;
}

export interface Wing {
  id: string;
  buildingId: string;
  name: string;
}

export interface Floor {
  id: string;
  wingId: string;
  name: string;
}

export interface Room {
  id: string;
  floorId: string;
  number: string;
  wing: string;
  floor: string;
  building: string;
  projectId: string;
}

export interface Photo {
  id: string;
  issueId: string;
  originalUrl: string; // Base64 original
  annotatedUrl: string; // Base64 annotated
  annotationsJson: string; // Serialized drawing shapes
}

export interface Issue {
  id: string;
  roomId: string;
  projectId: string;
  buildingId: string;
  wingId: string;
  floorId: string;
  title: string;
  category: string;
  subCategory: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Cosmetic';
  description: string;
  remarks: string;
  status: 'draft' | 'pending' | 'completed';
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
  photos: string[]; // List of Photo IDs
  createdDate: number;
  createdBy: string;
}

export interface DefectTemplate {
  id: string;
  name: string;
  category: string;
  subCategory: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Cosmetic';
  description: string;
  recommendedAction: string;
  department: string;
  status: 'draft' | 'pending' | 'completed';
  isFavorite: number; // 1 = true, 0 = false (indexable)
}

export interface LicenseRecord {
  id: string;
  customerId: string;
  deviceId: string;
  plan: string;
  activationDate: number;
  expiryDate: number;
  encryptedBlob: string; // Encrypted license JSON
  createdAt: number;
}

class InspectionDatabase extends Dexie {
  projects!: Table<Project>;
  buildings!: Table<Building>;
  wings!: Table<Wing>;
  floors!: Table<Floor>;
  rooms!: Table<Room>;
  photos!: Table<Photo>;
  issues!: Table<Issue>;
  templates!: Table<DefectTemplate>;
  licenseRecords!: Table<LicenseRecord>;

  constructor() {
    super('InspectionDatabase');
    this.version(1).stores({
      projects: 'id, name, buildingName, offlineStatus, syncStatus',
      buildings: 'id, projectId, name',
      wings: 'id, buildingId, name',
      floors: 'id, wingId, name',
      rooms: 'id, floorId, number, wing, floor, building, projectId',
      photos: 'id, issueId',
      issues: 'id, roomId, projectId, buildingId, wingId, floorId, category, priority, status, createdDate, createdBy',
      templates: 'id, name, category, priority, isFavorite',
    });

    // Version 2: Add license records table for audit trail
    this.version(2).stores({
      projects: 'id, name, buildingName, offlineStatus, syncStatus',
      buildings: 'id, projectId, name',
      wings: 'id, buildingId, name',
      floors: 'id, wingId, name',
      rooms: 'id, floorId, number, wing, floor, building, projectId',
      photos: 'id, issueId',
      issues: 'id, roomId, projectId, buildingId, wingId, floorId, category, priority, status, createdDate, createdBy',
      templates: 'id, name, category, priority, isFavorite',
      licenseRecords: 'id, customerId, deviceId, plan, activationDate, expiryDate, createdAt',
    });
  }
}

export const db = new InspectionDatabase();

import { logger } from '@/utils/logger';

// Handle version changes to prevent database upgrades from hanging
if (typeof window !== 'undefined') {
  db.on('versionchange', () => {
    db.close();
    logger.log('Database version change detected. Connection closed to allow upgrade.');
  });
}

// Seeding function to populate sample offline data
export async function seedDatabase() {
  const projectCount = await db.projects.count();
  if (projectCount > 0) return; // Already seeded

  logger.log('Seeding offline building database...');

  // 1. Projects
  const projects: Project[] = [
    {
      id: 'proj-1',
      name: 'Burj Khalifa Commercial',
      buildingName: 'Main Tower',
      pendingIssues: 3,
      completedIssues: 1,
      lastUpdated: Date.now(),
      offlineStatus: 'offline',
      syncStatus: 'pending',
    },
    {
      id: 'proj-2',
      name: 'Dubai Mall Extension',
      buildingName: 'Fashion Avenue',
      pendingIssues: 1,
      completedIssues: 2,
      lastUpdated: Date.now(),
      offlineStatus: 'offline',
      syncStatus: 'synced',
    }
  ];
  await db.projects.bulkAdd(projects);

  // 2. Buildings
  const buildings: Building[] = [
    { id: 'bld-1', projectId: 'proj-1', name: 'Main Tower' },
    { id: 'bld-2', projectId: 'proj-2', name: 'Fashion Avenue Block' }
  ];
  await db.buildings.bulkAdd(buildings);

  // 3. Wings
  const wings: Wing[] = [
    { id: 'wing-1a', buildingId: 'bld-1', name: 'Zone A' },
    { id: 'wing-1b', buildingId: 'bld-1', name: 'Zone B' },
    { id: 'wing-2a', buildingId: 'bld-2', name: 'East Wing' },
    { id: 'wing-2b', buildingId: 'bld-2', name: 'West Wing' }
  ];
  await db.wings.bulkAdd(wings);

  // 4. Floors
  const floors: Floor[] = [
    { id: 'flr-1a-1', wingId: 'wing-1a', name: 'Floor 102' },
    { id: 'flr-1a-2', wingId: 'wing-1a', name: 'Floor 103' },
    { id: 'flr-1b-1', wingId: 'wing-1b', name: 'Floor 104' },
    { id: 'flr-2a-1', wingId: 'wing-2a', name: 'Ground Floor' },
    { id: 'flr-2a-2', wingId: 'wing-2a', name: 'First Floor' }
  ];
  await db.floors.bulkAdd(floors);

  // 5. Rooms
  const rooms: Room[] = [
    // Burj Khalifa
    { id: 'rm-1', floorId: 'flr-1a-1', number: 'Suite 10201', wing: 'Zone A', floor: 'Floor 102', building: 'Main Tower', projectId: 'proj-1' },
    { id: 'rm-2', floorId: 'flr-1a-1', number: 'Suite 10202', wing: 'Zone A', floor: 'Floor 102', building: 'Main Tower', projectId: 'proj-1' },
    { id: 'rm-3', floorId: 'flr-1a-2', number: 'Penthouse 10301', wing: 'Zone A', floor: 'Floor 103', building: 'Main Tower', projectId: 'proj-1' },
    { id: 'rm-4', floorId: 'flr-1b-1', number: 'Mech Room M01', wing: 'Zone B', floor: 'Floor 104', building: 'Main Tower', projectId: 'proj-1' },
    // Dubai Mall
    { id: 'rm-5', floorId: 'flr-2a-1', number: 'Retail Shop 12', wing: 'East Wing', floor: 'Ground Floor', building: 'Fashion Avenue Block', projectId: 'proj-2' },
    { id: 'rm-6', floorId: 'flr-2a-1', number: 'Retail Shop 14', wing: 'East Wing', floor: 'Ground Floor', building: 'Fashion Avenue Block', projectId: 'proj-2' },
    { id: 'rm-7', floorId: 'flr-2a-2', number: 'Restroom Block F1', wing: 'East Wing', floor: 'First Floor', building: 'Fashion Avenue Block', projectId: 'proj-2' }
  ];
  await db.rooms.bulkAdd(rooms);

  // 6. Defect Templates
  const defaultTemplates: DefectTemplate[] = [
    {
      id: 'tmpl-1',
      name: 'Wall Crack (Minor)',
      category: 'Civil',
      subCategory: 'Plastering',
      priority: 'Low',
      description: 'Hairline cracks observed on the plaster surface.',
      recommendedAction: 'Apply putty and repaint.',
      department: 'Maintenance Dept',
      status: 'pending',
      isFavorite: 1
    },
    {
      id: 'tmpl-2',
      name: 'Exposed Wiring',
      category: 'Electrical',
      subCategory: 'Cabling',
      priority: 'Critical',
      description: 'Live electrical cables exposed near floor skirting.',
      recommendedAction: 'Isolate immediately, tape wires, and enclose in trunking.',
      department: 'Electrical Team',
      status: 'pending',
      isFavorite: 1
    },
    {
      id: 'tmpl-3',
      name: 'AC Not Cooling',
      category: 'HVAC',
      subCategory: 'FCU unit',
      priority: 'High',
      description: 'Thermostat set to 18C but room temperature is 26C. Fan operates normally.',
      recommendedAction: 'Inspect refrigerant levels and clean FCU filters.',
      department: 'HVAC Specialists',
      status: 'pending',
      isFavorite: 0
    },
    {
      id: 'tmpl-4',
      name: 'Pipe Leakage',
      category: 'Plumbing',
      subCategory: 'Supply Pipes',
      priority: 'High',
      description: 'Water dripping slowly from copper pipe elbow under sink.',
      recommendedAction: 'Replace washer and reseal elbow joint.',
      department: 'Plumbing Maintenance',
      status: 'pending',
      isFavorite: 1
    },
    {
      id: 'tmpl-5',
      name: 'Door Jammed',
      category: 'Carpentry',
      subCategory: 'Doors',
      priority: 'Medium',
      description: 'Wooden door frame misaligned; door requires heavy force to lock.',
      recommendedAction: 'Shave door hinges and adjust strike plate alignment.',
      department: 'Carpentry Crew',
      status: 'pending',
      isFavorite: 0
    }
  ];
  await db.templates.bulkAdd(defaultTemplates);

  // 7. Seed Sample Issues to showcase visual charts and lists
  const issues: Issue[] = [
    {
      id: 'iss-1',
      roomId: 'rm-1',
      projectId: 'proj-1',
      buildingId: 'bld-1',
      wingId: 'wing-1a',
      floorId: 'flr-1a-1',
      title: 'Water drip in bathroom ceiling',
      category: 'Plumbing',
      subCategory: 'Drainage',
      priority: 'High',
      description: 'Slow leakage from floor trap on floor above, causing moisture patch.',
      remarks: 'Needs immediate inspection of floor trap seal above.',
      status: 'pending',
      gps: { latitude: 25.1972, longitude: 55.2744, accuracy: 5, timestamp: Date.now() },
      photos: [],
      createdDate: Date.now() - 3600000 * 2,
      createdBy: 'Auditor User'
    },
    {
      id: 'iss-2',
      roomId: 'rm-1',
      projectId: 'proj-1',
      buildingId: 'bld-1',
      wingId: 'wing-1a',
      floorId: 'flr-1a-1',
      title: 'Cracked glass window pane',
      category: 'Glass',
      subCategory: 'Windows',
      priority: 'Critical',
      description: 'Outer double-glazing panel has web crack. Potential safety risk.',
      remarks: 'Barricaded zone under the window outside.',
      status: 'pending',
      gps: { latitude: 25.1972, longitude: 55.2744, accuracy: 4, timestamp: Date.now() },
      photos: [],
      createdDate: Date.now() - 3600000 * 1,
      createdBy: 'Inspector User'
    },
    {
      id: 'iss-3',
      roomId: 'rm-3',
      projectId: 'proj-1',
      buildingId: 'bld-1',
      wingId: 'wing-1a',
      floorId: 'flr-1a-2',
      title: 'Damaged electrical switchboard',
      category: 'Electrical',
      subCategory: 'Sockets',
      priority: 'Medium',
      description: 'Plastic switch plate cracked, loose fitting.',
      remarks: 'To be replaced with standard metal clad type.',
      status: 'completed',
      photos: [],
      createdDate: Date.now() - 3600000 * 24,
      createdBy: 'Technician User'
    }
  ];
  await db.issues.bulkAdd(issues);
}

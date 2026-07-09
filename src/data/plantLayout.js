// ============================================================================
// ShieldAI — Plant Layout Data
// Defines physical zones, equipment, and evacuation routes for the facility.
// ============================================================================

export const ZONES = [
  {
    id: 'Z-A',
    name: 'Coke Oven Battery',
    hazardClass: 'Class I - Flammable Gas',
    x: 50,
    y: 80,
    width: 280,
    height: 180,
    equipment: ['Coke Ovens', 'Gas Collecting Main', 'By-Product Plant'],
    color: '#10B981',
  },
  {
    id: 'Z-B',
    name: 'Gas Mixing Station',
    hazardClass: 'Class I - Flammable Gas',
    x: 370,
    y: 80,
    width: 200,
    height: 140,
    equipment: ['Gas Holders', 'Mixing Valves', 'Flow Control'],
    color: '#10B981',
  },
  {
    id: 'Z-C',
    name: 'Ammonia Recovery',
    hazardClass: 'Class II - Toxic',
    x: 50,
    y: 300,
    width: 220,
    height: 150,
    equipment: ['Scrubbers', 'Absorption Towers', 'Storage Tanks'],
    color: '#10B981',
  },
  {
    id: 'Z-D',
    name: 'Blast Furnace Area',
    hazardClass: 'Class III - High Temp',
    x: 310,
    y: 300,
    width: 260,
    height: 150,
    equipment: ['Blast Furnace', 'Hot Metal Ladle', 'Slag Pit'],
    color: '#10B981',
  },
  {
    id: 'Z-E',
    name: 'Maintenance Workshop',
    hazardClass: 'General',
    x: 610,
    y: 80,
    width: 160,
    height: 140,
    equipment: ['Welding Stations', 'Tool Store', 'Crane Bay'],
    color: '#10B981',
  },
  {
    id: 'Z-F',
    name: 'Control Room',
    hazardClass: 'Safe Zone',
    x: 610,
    y: 300,
    width: 160,
    height: 150,
    equipment: ['SCADA HMI', 'Comm Hub'],
    color: '#10B981',
  },
];

/**
 * Evacuation routes between zones, represented as SVG path strings.
 * Each route defines a from-zone, a to-zone (assembly point or safe zone),
 * and the SVG path data for rendering the escape route overlay.
 */
export const EVACUATION_ROUTES = [
  {
    from: 'Z-A',
    to: 'Z-F',
    path: 'M 190 260 L 190 290 L 500 290 L 500 375 L 610 375',
    label: 'Route A→F (Primary)',
  },
  {
    from: 'Z-A',
    to: 'Z-E',
    path: 'M 330 170 L 350 170 L 350 150 L 610 150',
    label: 'Route A→E (Secondary)',
  },
  {
    from: 'Z-B',
    to: 'Z-F',
    path: 'M 470 220 L 470 290 L 610 290 L 690 300',
    label: 'Route B→F',
  },
  {
    from: 'Z-B',
    to: 'Z-E',
    path: 'M 570 150 L 610 150',
    label: 'Route B→E',
  },
  {
    from: 'Z-C',
    to: 'Z-F',
    path: 'M 270 375 L 310 375 L 500 375 L 610 375',
    label: 'Route C→F',
  },
  {
    from: 'Z-D',
    to: 'Z-F',
    path: 'M 570 375 L 610 375',
    label: 'Route D→F',
  },
  {
    from: 'Z-D',
    to: 'Z-E',
    path: 'M 440 300 L 440 270 L 690 270 L 690 220',
    label: 'Route D→E (Alt)',
  },
  {
    from: 'Z-E',
    to: 'Z-F',
    path: 'M 690 220 L 690 300',
    label: 'Route E→F',
  },
];

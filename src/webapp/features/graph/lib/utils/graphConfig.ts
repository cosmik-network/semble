/**
 * Force-directed graph physics and visual configuration
 * These settings control the graph layout animation and appearance
 */

/**
 * Physics simulation settings
 * Based on D3 force simulation parameters
 */
export const PHYSICS_CONFIG = {
  // Number of ticks to run before first render (helps settle the graph)
  warmupTicks: 100,

  // Number of ticks to run for cooldown after interactions
  cooldownTicks: 50,

  // How quickly the simulation cools down (0-1, lower = slower)
  // Lower values make the animation smoother but take longer to settle
  d3AlphaDecay: 0.02,

  // How much velocity is retained each tick (0-1, lower = more damping)
  // Controls how quickly nodes slow down
  d3VelocityDecay: 0.3,

  // Charge force strength (negative = repulsion)
  // Makes nodes push away from each other
  d3ForceCharge: -120,

  // Link distance (ideal length of connections)
  d3LinkDistance: 50,
} as const;

/**
 * Visual styling configuration
 */
export const VISUAL_CONFIG = {
  // Background color
  backgroundColor: '#f8fafc', // slate-50 from theme

  // Link styling
  link: {
    color: '#cbd5e1', // slate-300
    colorHighlight: '#64748b', // slate-500
    width: 1,
    widthHighlight: 2,
    opacity: 0.6,
    opacityHighlight: 1,
  },

  // Node styling
  node: {
    borderWidth: 1.5,
    borderWidthSelected: 3,
    borderColor: '#ffffff',
    shadowBlur: 0,
    shadowBlurSelected: 15,
    shadowColor: '#f59e0b', // accent color
  },

  // Label styling
  label: {
    fontFamily: 'Hanken Grotesk, system-ui, sans-serif',
    fontSize: 12,
    color: '#1f2937', // gray-800
    minZoomToShow: 1.0, // Only show labels when zoomed in past this level
    minConnectionsToAlwaysShow: 6, // Always show labels for highly connected nodes
  },

  // Directional arrows on links
  arrow: {
    length: 6,
    relativePosition: 1, // 1 = at target node
  },
} as const;

/**
 * Interaction configuration
 */
export const INTERACTION_CONFIG = {
  // Enable node dragging
  enableNodeDrag: true,

  // Enable zoom
  enableZoom: true,

  // Enable pan
  enablePan: true,

  // Zoom limits
  minZoom: 0.3,
  maxZoom: 8,

  // Hit area size multiplier (makes nodes easier to click)
  hitAreaMultiplier: 1.5,
} as const;

/**
 * Animation configuration
 */
export const ANIMATION_CONFIG = {
  // Transition duration for zoom/pan animations (ms)
  transitionDuration: 750,

  // Ease function for animations
  easingFunction: 'd3.easeCubicInOut',
} as const;

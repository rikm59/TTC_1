import type { ProjectTypeConfig } from '../types'

export const PROJECT_TYPES: ProjectTypeConfig[] = [
  {
    id: 'concrete',
    label: 'Concrete & Epoxy Coating',
    icon: '🏗️',
    subTypes: [
      {
        id: 'epoxy-garage',
        label: 'Garage Floor Epoxy/Polyurea',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '1409', required: true },
          { id: 'cracks', label: 'Number of Cracks/Patches', unit: 'each', placeholder: '3', required: false },
        ],
        defaultMaterials: [
          { name: 'Polyurea Base Coat Kit', category: 'Coating', unit: 'kit', baseUnitCost: 80, quantityFormula: 'Math.ceil(sqft / 100)', notes: 'Covers ~100 sq ft per kit' },
          { name: 'Decorative Vinyl Flakes (5 lb bag)', category: 'Coating', unit: 'bag', baseUnitCost: 50, quantityFormula: 'Math.ceil(sqft / 100)', notes: 'Covers ~100 sq ft' },
          { name: 'Polyaspartic UV Topcoat Kit', category: 'Coating', unit: 'kit', baseUnitCost: 72, quantityFormula: 'Math.ceil(sqft / 100)', notes: 'Covers ~100 sq ft' },
          { name: 'Anti-Slip Aggregate (5 lb bag)', category: 'Supplies', unit: 'bag', baseUnitCost: 35, quantityFormula: 'Math.ceil(sqft / 700)', notes: '' },
          { name: 'Concrete Patch Compound', category: 'Prep', unit: 'bag', baseUnitCost: 22, quantityFormula: 'Math.max(1, cracks || 2)', notes: '' },
          { name: 'Acid Etching Solution (1 gal)', category: 'Prep', unit: 'gal', baseUnitCost: 28, quantityFormula: 'Math.ceil(sqft / 500)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Day 1: Diamond Grind, Patch & Base Coat', workers: 2, hoursFormula: 'Math.max(6, Math.ceil(sqft / 200))', ratePerHour: 35 },
          { description: 'Day 2: Scrape, Vacuum & Topcoat', workers: 2, hoursFormula: 'Math.max(4, Math.ceil(sqft / 300))', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Diamond Grinding Disc & Consumables', costFormula: 'Math.max(150, sqft * 0.1)' },
          { description: 'Fuel & Vehicle Overhead', costFormula: '100' },
          { description: 'Rollers, Spikes, Tape, Bags', costFormula: '75' },
        ],
      },
      {
        id: 'concrete-driveway',
        label: 'Concrete Driveway',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '800', required: true },
          { id: 'thickness', label: 'Thickness', unit: 'inches', placeholder: '4', required: true },
          { id: 'tearout', label: 'Existing Concrete Tear-Out', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Ready-Mix Concrete', category: 'Concrete', unit: 'cubic yard', baseUnitCost: 165, quantityFormula: 'Math.ceil((sqft * (thickness / 12)) / 27 * 1.1)', notes: '+10% waste' },
          { name: 'Rebar (#4)', category: 'Reinforcement', unit: 'linear ft', baseUnitCost: 0.65, quantityFormula: 'sqft * 1.5', notes: '' },
          { name: 'Wire Mesh (150 sq ft roll)', category: 'Reinforcement', unit: 'roll', baseUnitCost: 65, quantityFormula: 'Math.ceil(sqft / 140)', notes: '' },
          { name: 'Form Boards (2x4x10)', category: 'Forming', unit: 'each', baseUnitCost: 8, quantityFormula: 'Math.ceil(Math.sqrt(sqft) * 4 / 10)', notes: '' },
          { name: 'Control Joint Sealer', category: 'Finishing', unit: 'tube', baseUnitCost: 12, quantityFormula: 'Math.ceil(sqft / 200)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Excavation & Sub-base Prep', workers: 2, hoursFormula: 'Math.ceil(sqft / 150)', ratePerHour: 38 },
          { description: 'Form Setting & Rebar', workers: 2, hoursFormula: 'Math.ceil(sqft / 200)', ratePerHour: 38 },
          { description: 'Pour, Finish & Cure', workers: 3, hoursFormula: 'Math.ceil(sqft / 300)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Concrete pump rental', costFormula: 'sqft > 500 ? 450 : 0' },
          { description: 'Equipment & Tools', costFormula: '200' },
          { description: 'Dump fees (tear-out)', costFormula: '(tearout || 0) * 0.5' },
        ],
      },
      {
        id: 'concrete-patio',
        label: 'Concrete Patio Slab',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '400', required: true },
          { id: 'thickness', label: 'Thickness', unit: 'inches', placeholder: '4', required: true },
        ],
        defaultMaterials: [
          { name: 'Ready-Mix Concrete', category: 'Concrete', unit: 'cubic yard', baseUnitCost: 165, quantityFormula: 'Math.ceil((sqft * (thickness / 12)) / 27 * 1.1)', notes: '' },
          { name: 'Wire Mesh (150 sq ft roll)', category: 'Reinforcement', unit: 'roll', baseUnitCost: 65, quantityFormula: 'Math.ceil(sqft / 140)', notes: '' },
          { name: 'Gravel Base (ton)', category: 'Base', unit: 'ton', baseUnitCost: 45, quantityFormula: 'Math.ceil(sqft / 100)', notes: '2" base' },
          { name: 'Form Boards', category: 'Forming', unit: 'each', baseUnitCost: 8, quantityFormula: 'Math.ceil(Math.sqrt(sqft) * 4 / 10)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Excavation & Gravel Base', workers: 2, hoursFormula: 'Math.ceil(sqft / 200)', ratePerHour: 38 },
          { description: 'Form, Pour & Finish', workers: 3, hoursFormula: 'Math.ceil(sqft / 250)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Equipment & Tools', costFormula: '175' },
          { description: 'Fuel & Vehicle', costFormula: '75' },
        ],
      },
    ],
  },
  {
    id: 'paint',
    label: 'Paint',
    icon: '🖌️',
    subTypes: [
      {
        id: 'interior-paint',
        label: 'Interior Walls & Ceilings',
        measurements: [
          { id: 'sqft', label: 'Wall Square Footage', unit: 'sq ft', placeholder: '1200', required: true },
          { id: 'ceilings', label: 'Ceiling Square Footage', unit: 'sq ft', placeholder: '600', required: false },
          { id: 'doors', label: 'Number of Doors', unit: 'each', placeholder: '8', required: false },
          { id: 'trim_lf', label: 'Linear Feet of Trim/Baseboards', unit: 'lin ft', placeholder: '200', required: false },
          { id: 'paint_grade', label: 'Paint Grade (1=builder $20, 2=mid $32, 3=premium $52, 4=designer $85)', unit: '', placeholder: '2', required: false },
          { id: 'surface_condition', label: 'Surface Condition (1=normal, 2=minor repair, 3=major repair)', unit: '', placeholder: '1', required: false },
          { id: 'accent_walls', label: 'Number of Accent Walls', unit: 'each', placeholder: '0', required: false },
          { id: 'wallpaper_sqft', label: 'Wallpaper Removal Area', unit: 'sq ft', placeholder: '0', required: false },
          { id: 'popcorn_sqft', label: 'Popcorn Ceiling Removal Area', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Interior Wall Paint (mid-grade)', category: 'Paint', unit: 'gallon', baseUnitCost: 32, quantityFormula: 'Math.ceil((sqft + (ceilings || 0)) / 350 * 2)', notes: '2 coats, 350 sqft/gal; builder=$20, mid=$32, premium=$52, designer=$85' },
          { name: 'Ceiling Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 38, quantityFormula: 'Math.ceil((ceilings || 0) / 400)', notes: '' },
          { name: 'Primer', category: 'Paint', unit: 'gallon', baseUnitCost: 32, quantityFormula: 'Math.ceil((sqft + (ceilings || 0)) / 400)', notes: '' },
          { name: 'Trim & Door Paint', category: 'Paint', unit: 'quart', baseUnitCost: 18, quantityFormula: 'Math.ceil(((doors || 0) * 20 + (trim_lf || 0)) / 150)', notes: '$1–$4/lin ft for trim; $50–$200/door' },
          { name: "Painter's Tape (1.5\" roll)", category: 'Supplies', unit: 'roll', baseUnitCost: 8, quantityFormula: 'Math.ceil((trim_lf || 100) / 60)', notes: '' },
          { name: 'Drop Cloths', category: 'Supplies', unit: 'each', baseUnitCost: 12, quantityFormula: 'Math.max(2, Math.ceil(sqft / 300))', notes: '' },
          { name: 'Roller Covers & Brushes (set)', category: 'Supplies', unit: 'set', baseUnitCost: 22, quantityFormula: 'Math.max(1, Math.ceil(sqft / 600))', notes: '' },
          { name: 'Patching Compound & Sandpaper', category: 'Prep', unit: 'set', baseUnitCost: 28, quantityFormula: '(surface_condition || 1) >= 2 ? Math.ceil(sqft / 300) : 0', notes: '$1–$3/sqft for surface repair' },
          { name: 'Drywall Repair Material', category: 'Prep', unit: 'job', baseUnitCost: 238, quantityFormula: '(surface_condition || 1) === 3 ? 1 : 0', notes: '$150–$325 for major repairs' },
          { name: 'Accent Wall Paint (deep/specialty color)', category: 'Paint', unit: 'gallon', baseUnitCost: 55, quantityFormula: '(accent_walls || 0) > 0 ? Math.ceil((accent_walls || 0) * 150 / 350 * 2) : 0', notes: '~150 sqft per accent wall, 2 coats' },
          { name: 'Wallpaper Remover Solution', category: 'Prep', unit: 'gallon', baseUnitCost: 18, quantityFormula: 'Math.ceil((wallpaper_sqft || 0) / 200)', notes: '$1–$3/sqft labour to remove' },
          { name: 'Popcorn Ceiling Removal Supplies', category: 'Prep', unit: 'set', baseUnitCost: 35, quantityFormula: '(popcorn_sqft || 0) > 0 ? 1 : 0', notes: 'Scraper, spray, plastic sheeting' },
        ],
        defaultLabor: [
          { description: 'Prep, Tape & Prime', workers: 2, hoursFormula: 'Math.ceil((sqft + (ceilings || 0)) / 300)', ratePerHour: 32 },
          { description: 'Paint Walls & Ceilings', workers: 2, hoursFormula: 'Math.ceil((sqft + (ceilings || 0)) / 250)', ratePerHour: 32 },
          { description: 'Trim, Doors & Cleanup', workers: 1, hoursFormula: 'Math.ceil(((doors || 0) * 1.5 + (trim_lf || 0) / 100) + 2)', ratePerHour: 32 },
          { description: 'Surface Repair & Patching', workers: 1, hoursFormula: '(surface_condition || 1) >= 2 ? Math.ceil(sqft * ((surface_condition || 1) === 3 ? 0.025 : 0.012)) : 0', ratePerHour: 40 },
          { description: 'Wallpaper Removal', workers: 2, hoursFormula: 'Math.ceil((wallpaper_sqft || 0) / 150)', ratePerHour: 35 },
          { description: 'Popcorn Ceiling Removal', workers: 2, hoursFormula: 'Math.ceil((popcorn_sqft || 0) / 200)', ratePerHour: 35 },
          { description: 'Accent Wall Masking & Specialty Coat', workers: 1, hoursFormula: '(accent_walls || 0) * 2.5', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Plastic sheeting & masking', costFormula: '50' },
          { description: 'Fuel & vehicle', costFormula: '60' },
          { description: 'Furniture moving (if needed)', costFormula: '(surface_condition || 1) >= 2 ? 45 : 0' },
        ],
      },
      {
        id: 'exterior-paint',
        label: 'Exterior Siding',
        measurements: [
          { id: 'sqft', label: 'Exterior Wall Square Footage', unit: 'sq ft', placeholder: '2000', required: true },
          { id: 'stories', label: 'Number of Stories', unit: 'stories', placeholder: '1', required: true },
          { id: 'trim_lf', label: 'Linear Feet of Trim/Fascia/Soffit', unit: 'lin ft', placeholder: '300', required: false },
          { id: 'siding_type', label: 'Siding Type (1=wood, 2=vinyl, 3=stucco, 4=brick, 5=aluminum)', unit: '', placeholder: '1', required: false },
          { id: 'ext_doors', label: 'Number of Exterior Doors', unit: 'each', placeholder: '2', required: false },
        ],
        defaultMaterials: [
          { name: 'Exterior Paint (Premium)', category: 'Paint', unit: 'gallon', baseUnitCost: 62, quantityFormula: 'Math.ceil(sqft / 350 * 2)', notes: '2 coats; wood $1.50–$5/sqft, vinyl $1.50–$4.50, stucco/brick $2–$5' },
          { name: 'Exterior Primer', category: 'Paint', unit: 'gallon', baseUnitCost: 38, quantityFormula: 'Math.ceil(sqft / 400)', notes: '' },
          { name: 'Trim, Fascia & Soffit Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 55, quantityFormula: 'Math.ceil((trim_lf || 200) / 300)', notes: '$2–$6/lin ft for eaves/fascia/soffit' },
          { name: 'Exterior Door Paint', category: 'Paint', unit: 'quart', baseUnitCost: 22, quantityFormula: '(ext_doors || 0)', notes: '$75–$200 per door side installed' },
          { name: 'Specialty Masonry/Stucco Coating', category: 'Paint', unit: 'gallon', baseUnitCost: 48, quantityFormula: '(siding_type || 1) >= 3 ? Math.ceil(sqft / 300) : 0', notes: 'For stucco/brick/masonry; fog coat $2–$8/sqft' },
          { name: 'Caulk (exterior)', category: 'Supplies', unit: 'tube', baseUnitCost: 8, quantityFormula: 'Math.ceil(sqft / 200)', notes: '' },
          { name: 'Roller Covers & Brushes', category: 'Supplies', unit: 'set', baseUnitCost: 28, quantityFormula: 'Math.max(2, Math.ceil(sqft / 500))', notes: '' },
        ],
        defaultLabor: [
          { description: 'Power Wash, Prep & Caulk', workers: 2, hoursFormula: 'Math.ceil(sqft / 350 * stories)', ratePerHour: 35 },
          { description: 'Prime & Paint Siding', workers: 2, hoursFormula: 'Math.ceil(sqft / 250 * stories)', ratePerHour: 35 },
          { description: 'Trim, Fascia, Soffit & Doors', workers: 1, hoursFormula: 'Math.ceil((trim_lf || 200) / 100 + (ext_doors || 0) * 1.5)', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Scaffolding/ladder rental', costFormula: 'stories > 1 ? 250 : 0' },
          { description: 'Power washer rental', costFormula: '75' },
          { description: 'Fuel & vehicle', costFormula: '100' },
        ],
      },
      {
        id: 'cabinet-paint',
        label: 'Cabinet Refinishing/Painting',
        measurements: [
          { id: 'doors', label: 'Number of Cabinet Doors', unit: 'each', placeholder: '24', required: true },
          { id: 'drawers', label: 'Number of Drawers', unit: 'each', placeholder: '12', required: false },
          { id: 'linear_feet', label: 'Linear Feet of Cabinet Frames (optional)', unit: 'lin ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Cabinet Paint (alkyd/waterborne)', category: 'Paint', unit: 'quart', baseUnitCost: 32, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 10)', notes: '$70–$125/door or $30–$70/lin ft for full job' },
          { name: 'Cabinet Primer', category: 'Paint', unit: 'quart', baseUnitCost: 22, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 12)', notes: '' },
          { name: 'Liquid Deglosser (qt)', category: 'Prep', unit: 'quart', baseUnitCost: 18, quantityFormula: '2', notes: '' },
          { name: 'Sandpaper (assorted)', category: 'Supplies', unit: 'pack', baseUnitCost: 15, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 10)', notes: '' },
          { name: 'Wood Filler', category: 'Prep', unit: 'tube', baseUnitCost: 8, quantityFormula: '2', notes: '' },
          { name: 'Frame/Box Paint (gallon)', category: 'Paint', unit: 'gallon', baseUnitCost: 38, quantityFormula: '(linear_feet || 0) > 0 ? Math.ceil((linear_feet || 0) / 60) : 0', notes: 'For face frames & box interiors' },
        ],
        defaultLabor: [
          { description: 'Remove doors, prep & sand', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.5)', ratePerHour: 38 },
          { description: 'Prime & Paint doors/drawers', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.6)', ratePerHour: 38 },
          { description: 'Paint cabinet frames & boxes', workers: 1, hoursFormula: '(linear_feet || 0) > 0 ? Math.ceil((linear_feet || 0) / 20) : 0', ratePerHour: 38 },
          { description: 'Reinstall & hardware', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.3)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Spray equipment setup/cleanup', costFormula: '50' },
          { description: 'Fuel & vehicle', costFormula: '50' },
        ],
      },
      {
        id: 'deck-fence-paint',
        label: 'Deck, Fence & Outbuilding Paint/Stain',
        measurements: [
          { id: 'deck_sqft', label: 'Deck Square Footage', unit: 'sq ft', placeholder: '400', required: false },
          { id: 'fence_lf', label: 'Linear Feet of Fence', unit: 'lin ft', placeholder: '100', required: false },
          { id: 'fence_height', label: 'Fence Height', unit: 'feet', placeholder: '6', required: false },
          { id: 'outbuilding_sqft', label: 'Outbuilding/Garage/Shed Exterior (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Deck Paint/Solid Stain', category: 'Paint', unit: 'gallon', baseUnitCost: 45, quantityFormula: 'Math.ceil((deck_sqft || 0) / 300 * 2)', notes: '2 coats; $2–$5/sqft installed' },
          { name: 'Deck Cleaner/Prep Solution', category: 'Prep', unit: 'gallon', baseUnitCost: 22, quantityFormula: 'Math.ceil((deck_sqft || 0) / 500)', notes: '' },
          { name: 'Deck Primer (bare wood)', category: 'Paint', unit: 'gallon', baseUnitCost: 32, quantityFormula: 'Math.ceil((deck_sqft || 0) / 400)', notes: '' },
          { name: 'Fence Stain/Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 38, quantityFormula: 'Math.ceil((fence_lf || 0) * (fence_height || 6) * 2 / 350)', notes: 'Both sides; $1–$3/sqft installed' },
          { name: 'Outbuilding Exterior Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 48, quantityFormula: 'Math.ceil((outbuilding_sqft || 0) / 350 * 2)', notes: '' },
          { name: "Painter's Tape & Drop Cloths", category: 'Supplies', unit: 'set', baseUnitCost: 25, quantityFormula: '1', notes: '' },
          { name: 'Caulk (exterior)', category: 'Supplies', unit: 'tube', baseUnitCost: 8, quantityFormula: 'Math.ceil(((deck_sqft || 0) + (outbuilding_sqft || 0)) / 400)', notes: '' },
          { name: 'Roller Covers & Brushes', category: 'Supplies', unit: 'set', baseUnitCost: 28, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Clean, scrape & prep deck', workers: 1, hoursFormula: 'Math.ceil((deck_sqft || 0) / 300)', ratePerHour: 32 },
          { description: 'Prime & stain/paint deck (2 coats)', workers: 2, hoursFormula: 'Math.ceil((deck_sqft || 0) / 200)', ratePerHour: 30 },
          { description: 'Paint/stain fence (both sides)', workers: 2, hoursFormula: 'Math.ceil((fence_lf || 0) * (fence_height || 6) * 2 / 300)', ratePerHour: 30 },
          { description: 'Outbuilding exterior paint', workers: 2, hoursFormula: 'Math.ceil((outbuilding_sqft || 0) / 250)', ratePerHour: 32 },
        ],
        defaultOverhead: [
          { description: 'Pressure washer rental', costFormula: '(deck_sqft || 0) > 0 ? 75 : 0' },
          { description: 'Pump sprayer rental (fence)', costFormula: '(fence_lf || 0) > 150 ? 50 : 0' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
      {
        id: 'new-construction-paint',
        label: 'New Construction Interior',
        measurements: [
          { id: 'sqft', label: 'Wall Square Footage', unit: 'sq ft', placeholder: '3000', required: true },
          { id: 'ceilings', label: 'Ceiling Square Footage', unit: 'sq ft', placeholder: '1200', required: false },
          { id: 'doors', label: 'Number of Doors', unit: 'each', placeholder: '12', required: false },
          { id: 'trim_lf', label: 'Linear Feet of Trim/Baseboards', unit: 'lin ft', placeholder: '400', required: false },
          { id: 'paint_grade', label: 'Paint Grade (1=builder $20, 2=mid $32, 3=premium $52)', unit: '', placeholder: '2', required: false },
        ],
        defaultMaterials: [
          { name: 'Interior Wall Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 30, quantityFormula: 'Math.ceil((sqft + (ceilings || 0)) / 350 * 2)', notes: '2 coats on bare drywall; $2–$4/sqft total for new construction' },
          { name: 'Drywall Sealer Primer (bare drywall)', category: 'Paint', unit: 'gallon', baseUnitCost: 28, quantityFormula: 'Math.ceil((sqft + (ceilings || 0)) / 400)', notes: 'Required coat on all bare drywall' },
          { name: 'Ceiling Paint', category: 'Paint', unit: 'gallon', baseUnitCost: 35, quantityFormula: 'Math.ceil((ceilings || 0) / 400)', notes: '' },
          { name: 'Trim & Door Paint (alkyd)', category: 'Paint', unit: 'gallon', baseUnitCost: 48, quantityFormula: 'Math.ceil(((doors || 0) * 25 + (trim_lf || 0)) / 300)', notes: '$1–$4/lin ft trim; $50–$200/door' },
          { name: "Painter's Tape (1.5\" roll)", category: 'Supplies', unit: 'roll', baseUnitCost: 8, quantityFormula: 'Math.ceil((trim_lf || 150) / 60)', notes: '' },
          { name: 'Roller Covers & Brushes (set)', category: 'Supplies', unit: 'set', baseUnitCost: 22, quantityFormula: 'Math.max(2, Math.ceil(sqft / 600))', notes: '' },
          { name: 'Drop Cloths', category: 'Supplies', unit: 'each', baseUnitCost: 12, quantityFormula: 'Math.max(3, Math.ceil(sqft / 300))', notes: '' },
        ],
        defaultLabor: [
          { description: 'Prime bare drywall (walls & ceilings)', workers: 2, hoursFormula: 'Math.ceil((sqft + (ceilings || 0)) / 350)', ratePerHour: 32 },
          { description: 'Paint walls & ceilings (2 coats)', workers: 2, hoursFormula: 'Math.ceil((sqft + (ceilings || 0)) / 250)', ratePerHour: 32 },
          { description: 'Trim, doors & cleanup', workers: 1, hoursFormula: 'Math.ceil(((doors || 0) * 1.5 + (trim_lf || 0) / 80) + 2)', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Plastic sheeting & tape', costFormula: '75' },
          { description: 'Spray equipment (large new construction)', costFormula: 'sqft > 2000 ? 150 : 0' },
          { description: 'Fuel & vehicle', costFormula: '100' },
        ],
      },
    ],
  },
  {
    id: 'fencing',
    label: 'Fencing',
    icon: '🚧',
    subTypes: [
      {
        id: 'wood-privacy',
        label: 'Wood Privacy Fence',
        measurements: [
          { id: 'lf', label: 'Linear Feet of Fence', unit: 'lin ft', placeholder: '150', required: true },
          { id: 'height', label: 'Height', unit: 'feet', placeholder: '6', required: true },
          { id: 'gates', label: 'Number of Gates', unit: 'each', placeholder: '1', required: false },
        ],
        defaultMaterials: [
          { name: '4x4 Cedar/PT Post (10 ft)', category: 'Lumber', unit: 'each', baseUnitCost: 18, quantityFormula: 'Math.ceil(lf / 8) + 1', notes: 'Posts every 8 ft' },
          { name: '2x4 Rail (8 ft)', category: 'Lumber', unit: 'each', baseUnitCost: 9, quantityFormula: 'Math.ceil(lf / 8) * (height <= 6 ? 2 : 3) * 2', notes: '' },
          { name: '1x6 Cedar Fence Boards (6 ft)', category: 'Lumber', unit: 'each', baseUnitCost: 6.5, quantityFormula: 'Math.ceil(lf * 12 / 5.5)', notes: '' },
          { name: 'Concrete (60 lb bag)', category: 'Concrete', unit: 'bag', baseUnitCost: 7.5, quantityFormula: '(Math.ceil(lf / 8) + 1) * 2', notes: '2 bags/post' },
          { name: 'Fence Hardware (screws/nails/brackets)', category: 'Hardware', unit: 'pack', baseUnitCost: 28, quantityFormula: 'Math.ceil(lf / 50)', notes: '' },
          { name: 'Gate Hardware Kit', category: 'Hardware', unit: 'kit', baseUnitCost: 45, quantityFormula: '(gates || 0)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Layout, dig & set posts', workers: 2, hoursFormula: 'Math.ceil((Math.ceil(lf / 8) + 1) * 0.75)', ratePerHour: 36 },
          { description: 'Install rails & boards', workers: 2, hoursFormula: 'Math.ceil(lf / 30)', ratePerHour: 36 },
          { description: 'Gate install & finish', workers: 2, hoursFormula: '(gates || 0) * 2 + 1', ratePerHour: 36 },
        ],
        defaultOverhead: [
          { description: 'Post hole digger rental', costFormula: 'Math.ceil(lf / 8) > 10 ? 150 : 85' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
      {
        id: 'vinyl-fence',
        label: 'Vinyl / PVC Fence',
        measurements: [
          { id: 'lf', label: 'Linear Feet of Fence', unit: 'lin ft', placeholder: '120', required: true },
          { id: 'height', label: 'Height', unit: 'feet', placeholder: '6', required: true },
          { id: 'gates', label: 'Number of Gates', unit: 'each', placeholder: '1', required: false },
        ],
        defaultMaterials: [
          { name: 'Vinyl Fence Panel (8 ft section)', category: 'Fencing', unit: 'panel', baseUnitCost: 65, quantityFormula: 'Math.ceil(lf / 8)', notes: '' },
          { name: 'Vinyl Post (with cap)', category: 'Fencing', unit: 'each', baseUnitCost: 42, quantityFormula: 'Math.ceil(lf / 8) + 1', notes: '' },
          { name: 'Concrete (60 lb bag)', category: 'Concrete', unit: 'bag', baseUnitCost: 7.5, quantityFormula: '(Math.ceil(lf / 8) + 1) * 2', notes: '' },
          { name: 'Vinyl Gate Kit', category: 'Fencing', unit: 'kit', baseUnitCost: 185, quantityFormula: '(gates || 0)', notes: '' },
          { name: 'Post Caps & Hardware', category: 'Hardware', unit: 'set', baseUnitCost: 15, quantityFormula: 'Math.ceil(lf / 8) + 1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Layout, dig & set posts', workers: 2, hoursFormula: 'Math.ceil((Math.ceil(lf / 8) + 1) * 0.75)', ratePerHour: 36 },
          { description: 'Install panels & gates', workers: 2, hoursFormula: 'Math.ceil(lf / 35)', ratePerHour: 36 },
        ],
        defaultOverhead: [
          { description: 'Post hole digger rental', costFormula: '85' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
      {
        id: 'chain-link',
        label: 'Chain Link Fence',
        measurements: [
          { id: 'lf', label: 'Linear Feet', unit: 'lin ft', placeholder: '200', required: true },
          { id: 'height', label: 'Height', unit: 'feet', placeholder: '4', required: true },
          { id: 'gates', label: 'Number of Gates', unit: 'each', placeholder: '1', required: false },
        ],
        defaultMaterials: [
          { name: 'Chain Link Fabric (per roll)', category: 'Fencing', unit: 'roll', baseUnitCost: 85, quantityFormula: 'Math.ceil(lf / 50)', notes: '50 ft roll' },
          { name: 'Line Posts (1-5/8")', category: 'Fencing', unit: 'each', baseUnitCost: 22, quantityFormula: 'Math.ceil(lf / 10)', notes: 'Every 10 ft' },
          { name: 'Terminal/Corner Posts (2-1/2")', category: 'Fencing', unit: 'each', baseUnitCost: 35, quantityFormula: 'Math.ceil(lf / 50) * 2 + 2', notes: '' },
          { name: 'Top Rail (21 ft section)', category: 'Fencing', unit: 'each', baseUnitCost: 28, quantityFormula: 'Math.ceil(lf / 21)', notes: '' },
          { name: 'Concrete (60 lb bag)', category: 'Concrete', unit: 'bag', baseUnitCost: 7.5, quantityFormula: '(Math.ceil(lf / 10) + Math.ceil(lf / 50) * 2 + 2) * 1.5', notes: '' },
          { name: 'Chain Link Gate', category: 'Fencing', unit: 'each', baseUnitCost: 125, quantityFormula: '(gates || 0)', notes: '' },
          { name: 'Hardware (ties, tension bands)', category: 'Hardware', unit: 'bag', baseUnitCost: 20, quantityFormula: 'Math.ceil(lf / 100)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Dig & set posts', workers: 2, hoursFormula: 'Math.ceil(lf / 40)', ratePerHour: 34 },
          { description: 'Install rail & fabric', workers: 2, hoursFormula: 'Math.ceil(lf / 50)', ratePerHour: 34 },
        ],
        defaultOverhead: [
          { description: 'Post hole digger', costFormula: '85' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
    ],
  },
  {
    id: 'flooring',
    label: 'Flooring',
    icon: '🏠',
    subTypes: [
      {
        id: 'lvp-laminate',
        label: 'LVP / Laminate',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '800', required: true },
          { id: 'demo', label: 'Demo Existing Floor (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
          { id: 'stairs', label: 'Number of Stairs', unit: 'each', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'LVP Flooring', category: 'Flooring', unit: 'sq ft', baseUnitCost: 3.50, quantityFormula: 'Math.ceil(sqft * 1.1)', notes: '+10% waste' },
          { name: 'Underlayment', category: 'Flooring', unit: 'sq ft', baseUnitCost: 0.45, quantityFormula: 'Math.ceil(sqft * 1.05)', notes: '' },
          { name: 'Transition Strips', category: 'Trim', unit: 'each', baseUnitCost: 22, quantityFormula: 'Math.max(2, Math.ceil(sqft / 300))', notes: '' },
          { name: 'Stair Nosing', category: 'Trim', unit: 'each', baseUnitCost: 18, quantityFormula: '(stairs || 0)', notes: '' },
          { name: 'Tapping Block & Pull Bar', category: 'Supplies', unit: 'set', baseUnitCost: 20, quantityFormula: '1', notes: '' },
          { name: 'Spacers & Adhesive', category: 'Supplies', unit: 'pack', baseUnitCost: 12, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & disposal', workers: 1, hoursFormula: 'Math.ceil((demo || 0) / 400)', ratePerHour: 32 },
          { description: 'Subfloor prep & install', workers: 2, hoursFormula: 'Math.ceil(sqft / 200)', ratePerHour: 34 },
          { description: 'Stairs & trim', workers: 1, hoursFormula: 'Math.ceil((stairs || 0) * 0.5 + 2)', ratePerHour: 34 },
        ],
        defaultOverhead: [
          { description: 'Saw rental & blades', costFormula: '75' },
          { description: 'Fuel & vehicle', costFormula: '60' },
        ],
      },
      {
        id: 'hardwood',
        label: 'Hardwood Flooring',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '600', required: true },
          { id: 'demo', label: 'Demo Existing Floor (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Hardwood Flooring (3/4" solid)', category: 'Flooring', unit: 'sq ft', baseUnitCost: 7, quantityFormula: 'Math.ceil(sqft * 1.1)', notes: '+10% waste' },
          { name: 'Flooring Nails / Staples (box)', category: 'Hardware', unit: 'box', baseUnitCost: 28, quantityFormula: 'Math.ceil(sqft / 200)', notes: '' },
          { name: 'Adhesive (gallon)', category: 'Supplies', unit: 'gallon', baseUnitCost: 35, quantityFormula: 'Math.ceil(sqft / 120)', notes: '' },
          { name: 'Transitions & T-Molding', category: 'Trim', unit: 'each', baseUnitCost: 28, quantityFormula: 'Math.max(2, Math.ceil(sqft / 300))', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & subfloor prep', workers: 2, hoursFormula: 'Math.ceil((demo || 0) / 300) + 2', ratePerHour: 36 },
          { description: 'Install & nail', workers: 2, hoursFormula: 'Math.ceil(sqft / 150)', ratePerHour: 42 },
          { description: 'Sand, stain & finish', workers: 2, hoursFormula: 'Math.ceil(sqft / 200)', ratePerHour: 45 },
        ],
        defaultOverhead: [
          { description: 'Floor nailer rental', costFormula: '85' },
          { description: 'Sander rental', costFormula: '120' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
      {
        id: 'tile-flooring',
        label: 'Tile (Ceramic / Porcelain)',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '400', required: true },
          { id: 'demo', label: 'Demo Existing Floor (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Floor Tile', category: 'Flooring', unit: 'sq ft', baseUnitCost: 4.50, quantityFormula: 'Math.ceil(sqft * 1.12)', notes: '+12% cuts & waste' },
          { name: 'Thinset Mortar (50 lb bag)', category: 'Setting', unit: 'bag', baseUnitCost: 22, quantityFormula: 'Math.ceil(sqft / 40)', notes: '' },
          { name: 'Grout (10 lb bag)', category: 'Setting', unit: 'bag', baseUnitCost: 18, quantityFormula: 'Math.ceil(sqft / 50)', notes: '' },
          { name: 'Tile Spacers', category: 'Supplies', unit: 'bag', baseUnitCost: 5, quantityFormula: 'Math.ceil(sqft / 100)', notes: '' },
          { name: 'Tile Edge Trim', category: 'Trim', unit: 'lin ft', baseUnitCost: 3.5, quantityFormula: 'Math.sqrt(sqft) * 4', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & subfloor prep', workers: 2, hoursFormula: 'Math.ceil((demo || 0) / 200) + 3', ratePerHour: 35 },
          { description: 'Layout, cut & set tile', workers: 2, hoursFormula: 'Math.ceil(sqft / 100)', ratePerHour: 40 },
          { description: 'Grout, seal & cleanup', workers: 1, hoursFormula: 'Math.ceil(sqft / 150)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Tile saw rental', costFormula: '95' },
          { description: 'Mixing equipment', costFormula: '40' },
          { description: 'Fuel & vehicle', costFormula: '60' },
        ],
      },
      {
        id: 'carpet',
        label: 'Carpet',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '1000', required: true },
          { id: 'stairs', label: 'Number of Stairs', unit: 'each', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Carpet', category: 'Flooring', unit: 'sq ft', baseUnitCost: 3, quantityFormula: 'Math.ceil(sqft * 1.1)', notes: '+10% waste' },
          { name: 'Carpet Padding', category: 'Flooring', unit: 'sq ft', baseUnitCost: 0.60, quantityFormula: 'Math.ceil(sqft * 1.05)', notes: '' },
          { name: 'Tack Strips', category: 'Hardware', unit: 'lin ft', baseUnitCost: 0.35, quantityFormula: 'Math.sqrt(sqft) * 4', notes: '' },
          { name: 'Transition Strips', category: 'Trim', unit: 'each', baseUnitCost: 18, quantityFormula: 'Math.max(2, Math.ceil(sqft / 400))', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & prep', workers: 1, hoursFormula: 'Math.ceil(sqft / 400)', ratePerHour: 28 },
          { description: 'Install carpet & pad', workers: 2, hoursFormula: 'Math.ceil(sqft / 250)', ratePerHour: 30 },
          { description: 'Stairs', workers: 1, hoursFormula: '(stairs || 0) * 0.5', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Carpet stretcher & kicker', costFormula: '45' },
          { description: 'Fuel & vehicle', costFormula: '55' },
        ],
      },
    ],
  },
  {
    id: 'outdoor-patio',
    label: 'Outdoor Patio / Deck',
    icon: '🌿',
    subTypes: [
      {
        id: 'paver-patio',
        label: 'Paver Patio',
        measurements: [
          { id: 'sqft', label: 'Square Footage', unit: 'sq ft', placeholder: '400', required: true },
        ],
        defaultMaterials: [
          { name: 'Concrete Pavers', category: 'Hardscape', unit: 'sq ft', baseUnitCost: 4, quantityFormula: 'Math.ceil(sqft * 1.1)', notes: '+10% cuts' },
          { name: 'Paver Base (ton)', category: 'Base', unit: 'ton', baseUnitCost: 38, quantityFormula: 'Math.ceil(sqft / 80)', notes: '4" compacted base' },
          { name: 'Concrete Sand (ton)', category: 'Base', unit: 'ton', baseUnitCost: 42, quantityFormula: 'Math.ceil(sqft / 200)', notes: '1" bedding layer' },
          { name: 'Paver Edge Restraint', category: 'Edging', unit: 'lin ft', baseUnitCost: 1.50, quantityFormula: 'Math.sqrt(sqft) * 4', notes: '' },
          { name: 'Polymeric Sand (50 lb bag)', category: 'Jointing', unit: 'bag', baseUnitCost: 28, quantityFormula: 'Math.ceil(sqft / 60)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Excavate & grade', workers: 2, hoursFormula: 'Math.ceil(sqft / 120)', ratePerHour: 38 },
          { description: 'Base & sand layer', workers: 2, hoursFormula: 'Math.ceil(sqft / 150)', ratePerHour: 38 },
          { description: 'Set pavers & edge', workers: 2, hoursFormula: 'Math.ceil(sqft / 100)', ratePerHour: 40 },
          { description: 'Compact & sand fill', workers: 2, hoursFormula: 'Math.ceil(sqft / 300)', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Plate compactor rental', costFormula: '120' },
          { description: 'Skid steer / delivery', costFormula: 'sqft > 300 ? 250 : 100' },
          { description: 'Fuel & vehicle', costFormula: '100' },
        ],
      },
      {
        id: 'composite-deck',
        label: 'Composite Deck',
        measurements: [
          { id: 'sqft', label: 'Deck Square Footage', unit: 'sq ft', placeholder: '300', required: true },
          { id: 'height', label: 'Height Off Ground', unit: 'feet', placeholder: '2', required: true },
          { id: 'rail_lf', label: 'Linear Feet of Railing', unit: 'lin ft', placeholder: '60', required: false },
        ],
        defaultMaterials: [
          { name: 'Composite Decking (sq ft)', category: 'Decking', unit: 'sq ft', baseUnitCost: 8, quantityFormula: 'Math.ceil(sqft * 1.1)', notes: '+10% waste' },
          { name: 'PT Framing Lumber (LF)', category: 'Framing', unit: 'lin ft', baseUnitCost: 1.80, quantityFormula: 'sqft * 3', notes: 'Joists, beams, ledger' },
          { name: 'Concrete Deck Blocks / Piers', category: 'Foundation', unit: 'each', baseUnitCost: 12, quantityFormula: 'Math.ceil(sqft / 40)', notes: '' },
          { name: 'Composite Railing System', category: 'Railing', unit: 'lin ft', baseUnitCost: 55, quantityFormula: '(rail_lf || 0)', notes: '' },
          { name: 'Deck Screws / Hidden Fasteners', category: 'Hardware', unit: 'box', baseUnitCost: 45, quantityFormula: 'Math.ceil(sqft / 100)', notes: '' },
          { name: 'Joist Hangers & Hardware', category: 'Hardware', unit: 'bag', baseUnitCost: 22, quantityFormula: 'Math.ceil(sqft / 50)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Layout, footings & frame', workers: 2, hoursFormula: 'Math.ceil(sqft / 60)', ratePerHour: 42 },
          { description: 'Decking install', workers: 2, hoursFormula: 'Math.ceil(sqft / 80)', ratePerHour: 40 },
          { description: 'Railing & stairs', workers: 2, hoursFormula: 'Math.ceil((rail_lf || 0) / 20) + 4', ratePerHour: 42 },
        ],
        defaultOverhead: [
          { description: 'Tools & consumables', costFormula: '150' },
          { description: 'Permit fees (estimate)', costFormula: 'sqft > 200 ? 200 : 100' },
          { description: 'Fuel & vehicle', costFormula: '100' },
        ],
      },
    ],
  },
  {
    id: 'cabinets',
    label: 'Cabinets',
    icon: '🗄️',
    subTypes: [
      {
        id: 'kitchen-cabinets',
        label: 'Kitchen Cabinet Install',
        measurements: [
          { id: 'lower_lf', label: 'Linear Feet of Lower Cabinets', unit: 'lin ft', placeholder: '16', required: true },
          { id: 'upper_lf', label: 'Linear Feet of Upper Cabinets', unit: 'lin ft', placeholder: '14', required: false },
          { id: 'specialty', label: 'Number of Specialty Units (pantry, island)', unit: 'each', placeholder: '1', required: false },
          { id: 'cabinet_grade', label: 'Cabinet Grade (1=Stock, 2=Semi, 3=Custom)', unit: '', placeholder: '2', required: true },
        ],
        defaultMaterials: [
          { name: 'Base Cabinets', category: 'Cabinets', unit: 'lin ft', baseUnitCost: 180, quantityFormula: 'lower_lf', notes: 'Semi-custom pricing' },
          { name: 'Wall Cabinets', category: 'Cabinets', unit: 'lin ft', baseUnitCost: 140, quantityFormula: '(upper_lf || 0)', notes: '' },
          { name: 'Specialty Units', category: 'Cabinets', unit: 'each', baseUnitCost: 650, quantityFormula: '(specialty || 0)', notes: '' },
          { name: 'Cabinet Hardware (pulls/knobs)', category: 'Hardware', unit: 'each', baseUnitCost: 8, quantityFormula: '(lower_lf + (upper_lf || 0)) * 1.5', notes: '' },
          { name: 'Shims & Screws', category: 'Hardware', unit: 'pack', baseUnitCost: 12, quantityFormula: 'Math.ceil((lower_lf + (upper_lf || 0)) / 10)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove old cabinets', workers: 2, hoursFormula: 'Math.ceil((lower_lf + (upper_lf || 0)) / 8)', ratePerHour: 38 },
          { description: 'Install new cabinets', workers: 2, hoursFormula: 'Math.ceil((lower_lf + (upper_lf || 0)) / 4)', ratePerHour: 42 },
          { description: 'Trim out & hardware', workers: 1, hoursFormula: 'Math.ceil((lower_lf + (upper_lf || 0)) / 8)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Tools & consumables', costFormula: '100' },
          { description: 'Fuel & delivery help', costFormula: '125' },
        ],
      },
      {
        id: 'cabinet-refinish',
        label: 'Cabinet Refinish / Paint',
        measurements: [
          { id: 'doors', label: 'Number of Cabinet Doors', unit: 'each', placeholder: '24', required: true },
          { id: 'drawers', label: 'Number of Drawer Fronts', unit: 'each', placeholder: '12', required: false },
        ],
        defaultMaterials: [
          { name: 'Cabinet Primer', category: 'Paint', unit: 'quart', baseUnitCost: 24, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 10)', notes: '' },
          { name: 'Cabinet Paint (alkyd)', category: 'Paint', unit: 'quart', baseUnitCost: 34, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 8)', notes: '2 coats' },
          { name: 'Liquid Sander Deglosser', category: 'Prep', unit: 'quart', baseUnitCost: 18, quantityFormula: '2', notes: '' },
          { name: 'Sandpaper Pack', category: 'Supplies', unit: 'pack', baseUnitCost: 15, quantityFormula: 'Math.ceil((doors + (drawers || 0)) / 8)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove, clean & sand', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.4)', ratePerHour: 35 },
          { description: 'Prime & paint', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.6)', ratePerHour: 35 },
          { description: 'Reinstall', workers: 1, hoursFormula: 'Math.ceil((doors + (drawers || 0)) * 0.2)', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Spray setup & cleanup', costFormula: '60' },
          { description: 'Fuel & vehicle', costFormula: '50' },
        ],
      },
    ],
  },
  {
    id: 'framing-drywall',
    label: 'Framing & Drywall',
    icon: '🏗️',
    subTypes: [
      {
        id: 'new-walls',
        label: 'New Wall Framing & Drywall',
        measurements: [
          { id: 'sqft', label: 'Wall Square Footage (both sides)', unit: 'sq ft', placeholder: '800', required: true },
          { id: 'lf', label: 'Linear Feet of New Walls', unit: 'lin ft', placeholder: '80', required: true },
          { id: 'height', label: 'Ceiling Height', unit: 'feet', placeholder: '9', required: true },
        ],
        defaultMaterials: [
          { name: '2x4 Studs (8 ft)', category: 'Framing', unit: 'each', baseUnitCost: 6.50, quantityFormula: 'Math.ceil(lf / 1.33) + Math.ceil(lf * 0.15)', notes: '16" OC + extras' },
          { name: '2x4 Plates (8 ft)', category: 'Framing', unit: 'each', baseUnitCost: 6.50, quantityFormula: 'Math.ceil(lf * 3 / 8)', notes: 'Top/bottom/cap plates' },
          { name: 'Drywall 4x8 (1/2")', category: 'Drywall', unit: 'sheet', baseUnitCost: 14, quantityFormula: 'Math.ceil(sqft / 28 * 1.1)', notes: '+10% waste' },
          { name: 'Joint Compound (5 gal bucket)', category: 'Finishing', unit: 'bucket', baseUnitCost: 22, quantityFormula: 'Math.ceil(sqft / 200)', notes: '' },
          { name: 'Paper Tape (roll)', category: 'Finishing', unit: 'roll', baseUnitCost: 4, quantityFormula: 'Math.ceil(sqft / 100)', notes: '' },
          { name: 'Drywall Screws (5 lb box)', category: 'Hardware', unit: 'box', baseUnitCost: 8, quantityFormula: 'Math.ceil(sqft / 250)', notes: '' },
          { name: 'Corner Bead (8 ft)', category: 'Finishing', unit: 'each', baseUnitCost: 3, quantityFormula: 'Math.ceil(lf / 8) * 2', notes: '' },
          { name: 'Framing Nails (5 lb box)', category: 'Hardware', unit: 'box', baseUnitCost: 12, quantityFormula: 'Math.ceil(lf / 50)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Frame walls', workers: 2, hoursFormula: 'Math.ceil(lf / 25)', ratePerHour: 40 },
          { description: 'Hang drywall', workers: 2, hoursFormula: 'Math.ceil(sqft / 180)', ratePerHour: 38 },
          { description: 'Tape, float & sand (3 coats)', workers: 1, hoursFormula: 'Math.ceil(sqft / 100)', ratePerHour: 42 },
          { description: 'Prime & texture', workers: 1, hoursFormula: 'Math.ceil(sqft / 200)', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Drywall lift rental', costFormula: 'sqft > 400 ? 75 : 0' },
          { description: 'Tools & sandpaper', costFormula: '80' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
      {
        id: 'drywall-repair',
        label: 'Drywall Repair / Patch',
        measurements: [
          { id: 'patches', label: 'Number of Patches (small)', unit: 'each', placeholder: '5', required: false },
          { id: 'large_patches', label: 'Number of Large Patches (>1 sqft)', unit: 'each', placeholder: '2', required: false },
          { id: 'sqft', label: 'Full Sheet Replacement (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Drywall Patch Kit', category: 'Repair', unit: 'each', baseUnitCost: 12, quantityFormula: '(patches || 0)', notes: '' },
          { name: 'Drywall (4x8 sheet)', category: 'Drywall', unit: 'sheet', baseUnitCost: 14, quantityFormula: 'Math.ceil(((large_patches || 0) * 2 + (sqft || 0)) / 28)', notes: '' },
          { name: 'Joint Compound (qt)', category: 'Finishing', unit: 'each', baseUnitCost: 9, quantityFormula: 'Math.max(1, Math.ceil(((patches || 0) + (large_patches || 0)) / 5))', notes: '' },
          { name: 'Primer (qt)', category: 'Finishing', unit: 'quart', baseUnitCost: 14, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Patch, tape & feather', workers: 1, hoursFormula: 'Math.max(1, (patches || 0) * 0.5 + (large_patches || 0) * 1.5 + Math.ceil((sqft || 0) / 50))', ratePerHour: 42 },
        ],
        defaultOverhead: [
          { description: 'Supplies & sandpaper', costFormula: '30' },
          { description: 'Fuel & vehicle', costFormula: '40' },
        ],
      },
    ],
  },
  {
    id: 'windows',
    label: 'Windows',
    icon: '🪟',
    subTypes: [
      {
        id: 'window-replacement',
        label: 'Window Replacement',
        measurements: [
          { id: 'count_dh', label: 'Double-Hung Windows', unit: 'each', placeholder: '6', required: false },
          { id: 'count_sl', label: 'Sliding Windows', unit: 'each', placeholder: '2', required: false },
          { id: 'count_cs', label: 'Casement Windows', unit: 'each', placeholder: '2', required: false },
          { id: 'count_pict', label: 'Picture Windows', unit: 'each', placeholder: '1', required: false },
        ],
        defaultMaterials: [
          { name: 'Double-Hung Window (standard)', category: 'Windows', unit: 'each', baseUnitCost: 380, quantityFormula: '(count_dh || 0)', notes: '' },
          { name: 'Sliding Window (standard)', category: 'Windows', unit: 'each', baseUnitCost: 320, quantityFormula: '(count_sl || 0)', notes: '' },
          { name: 'Casement Window (standard)', category: 'Windows', unit: 'each', baseUnitCost: 450, quantityFormula: '(count_cs || 0)', notes: '' },
          { name: 'Picture Window (standard)', category: 'Windows', unit: 'each', baseUnitCost: 350, quantityFormula: '(count_pict || 0)', notes: '' },
          { name: 'Window Flashing Tape', category: 'Weatherproofing', unit: 'roll', baseUnitCost: 28, quantityFormula: 'Math.ceil(((count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)) / 4)', notes: '' },
          { name: 'Caulk (exterior)', category: 'Weatherproofing', unit: 'tube', baseUnitCost: 8, quantityFormula: '(count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)', notes: '' },
          { name: 'Shims & Fasteners', category: 'Hardware', unit: 'pack', baseUnitCost: 10, quantityFormula: 'Math.ceil(((count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)) / 5)', notes: '' },
          { name: 'Interior Trim Kit', category: 'Trim', unit: 'each', baseUnitCost: 22, quantityFormula: '(count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)', notes: '' },
        ],
        defaultLabor: [
          {
            description: 'Remove & install windows',
            workers: 2,
            hoursFormula: '((count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)) * 1.5',
            ratePerHour: 45,
          },
          {
            description: 'Caulk, insulate & trim',
            workers: 1,
            hoursFormula: '((count_dh || 0) + (count_sl || 0) + (count_cs || 0) + (count_pict || 0)) * 0.75',
            ratePerHour: 40,
          },
        ],
        defaultOverhead: [
          { description: 'Equipment & tools', costFormula: '100' },
          { description: 'Fuel & vehicle', costFormula: '75' },
        ],
      },
    ],
  },
  {
    id: 'landscaping',
    label: 'Yard & Landscape',
    icon: '🌱',
    subTypes: [
      {
        id: 'lawn-install',
        label: 'Sod / Lawn Install',
        measurements: [
          { id: 'sqft', label: 'Lawn Square Footage', unit: 'sq ft', placeholder: '3000', required: true },
          { id: 'demo', label: 'Kill / Remove Existing Lawn (sq ft)', unit: 'sq ft', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Sod (pallet = ~450 sq ft)', category: 'Lawn', unit: 'pallet', baseUnitCost: 195, quantityFormula: 'Math.ceil(sqft / 450)', notes: '' },
          { name: 'Topsoil (cubic yard)', category: 'Soil', unit: 'yard', baseUnitCost: 42, quantityFormula: 'Math.ceil(sqft / 300)', notes: '1" layer' },
          { name: 'Starter Fertilizer (50 lb)', category: 'Fertilizer', unit: 'bag', baseUnitCost: 32, quantityFormula: 'Math.ceil(sqft / 5000)', notes: '' },
          { name: 'Lawn Edging', category: 'Edging', unit: 'lin ft', baseUnitCost: 1.20, quantityFormula: 'Math.sqrt(sqft) * 4', notes: '' },
        ],
        defaultLabor: [
          { description: 'Kill/demo existing lawn', workers: 2, hoursFormula: 'Math.ceil((demo || 0) / 500)', ratePerHour: 30 },
          { description: 'Grade & soil prep', workers: 2, hoursFormula: 'Math.ceil(sqft / 400)', ratePerHour: 32 },
          { description: 'Lay sod', workers: 2, hoursFormula: 'Math.ceil(sqft / 600)', ratePerHour: 30 },
        ],
        defaultOverhead: [
          { description: 'Sod cutter rental', costFormula: '(demo || 0) > 0 ? 125 : 0' },
          { description: 'Delivery & vehicle', costFormula: '150' },
          { description: 'Roller rental', costFormula: '60' },
        ],
      },
      {
        id: 'landscape-design',
        label: 'Full Landscape Design & Install',
        measurements: [
          { id: 'sqft', label: 'Total Area (sq ft)', unit: 'sq ft', placeholder: '2000', required: true },
          { id: 'trees', label: 'Number of Trees', unit: 'each', placeholder: '3', required: false },
          { id: 'shrubs', label: 'Number of Shrubs/Plants', unit: 'each', placeholder: '20', required: false },
          { id: 'mulch_beds', label: 'Mulch Bed Area (sq ft)', unit: 'sq ft', placeholder: '400', required: false },
        ],
        defaultMaterials: [
          { name: 'Trees (15 gal size)', category: 'Plants', unit: 'each', baseUnitCost: 185, quantityFormula: '(trees || 0)', notes: '' },
          { name: 'Shrubs/Perennials (5 gal)', category: 'Plants', unit: 'each', baseUnitCost: 35, quantityFormula: '(shrubs || 0)', notes: '' },
          { name: 'Mulch (2 cu yd scoop)', category: 'Mulch', unit: 'scoop', baseUnitCost: 55, quantityFormula: 'Math.ceil((mulch_beds || 0) * 0.17 / 2)', notes: '2" depth' },
          { name: 'Landscape Fabric', category: 'Weed Control', unit: 'sq ft', baseUnitCost: 0.25, quantityFormula: '(mulch_beds || 0)', notes: '' },
          { name: 'Steel Edging', category: 'Edging', unit: 'lin ft', baseUnitCost: 1.50, quantityFormula: 'Math.ceil((mulch_beds || 0) / 10)', notes: '' },
          { name: 'Topsoil (yard)', category: 'Soil', unit: 'yard', baseUnitCost: 42, quantityFormula: 'Math.ceil((mulch_beds || 0) / 200)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Layout & grade', workers: 2, hoursFormula: 'Math.ceil(sqft / 400)', ratePerHour: 35 },
          { description: 'Plant trees & shrubs', workers: 2, hoursFormula: 'Math.ceil(((trees || 0) * 1.5 + (shrubs || 0) * 0.5))', ratePerHour: 35 },
          { description: 'Mulch beds & edge', workers: 2, hoursFormula: 'Math.ceil((mulch_beds || 0) / 200)', ratePerHour: 32 },
        ],
        defaultOverhead: [
          { description: 'Delivery fees', costFormula: '175' },
          { description: 'Equipment & tools', costFormula: '150' },
          { description: 'Fuel & vehicle', costFormula: '125' },
        ],
      },
    ],
  },
  {
    id: 'sprinklers',
    label: 'Sprinkler Systems',
    icon: '💧',
    subTypes: [
      {
        id: 'sprinkler-new',
        label: 'New Sprinkler System Install',
        measurements: [
          { id: 'sqft', label: 'Total Lawn Area (sq ft)', unit: 'sq ft', placeholder: '5000', required: true },
          { id: 'zones', label: 'Number of Zones', unit: 'each', placeholder: '5', required: true },
        ],
        defaultMaterials: [
          { name: 'Smart Irrigation Controller', category: 'Controller', unit: 'each', baseUnitCost: 145, quantityFormula: '1', notes: '' },
          { name: 'Zone Valve (1")', category: 'Valves', unit: 'each', baseUnitCost: 28, quantityFormula: 'zones', notes: '' },
          { name: 'Pop-up Rotary Heads', category: 'Heads', unit: 'each', baseUnitCost: 8, quantityFormula: 'Math.ceil(sqft / 200)', notes: '~200 sqft coverage each' },
          { name: 'PVC Pipe 3/4" (10 ft)', category: 'Pipe', unit: 'each', baseUnitCost: 5, quantityFormula: 'Math.ceil(sqft / 50)', notes: '' },
          { name: 'PVC Fittings & Elbows', category: 'Fittings', unit: 'bag', baseUnitCost: 18, quantityFormula: 'Math.ceil(sqft / 300)', notes: '' },
          { name: 'Valve Box (large)', category: 'Boxes', unit: 'each', baseUnitCost: 22, quantityFormula: 'Math.ceil(zones / 4)', notes: '' },
          { name: 'Control Wire (100 ft)', category: 'Wire', unit: 'roll', baseUnitCost: 28, quantityFormula: 'Math.ceil(zones / 3)', notes: '' },
          { name: 'Backflow Preventer', category: 'Backflow', unit: 'each', baseUnitCost: 85, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Layout & trench', workers: 2, hoursFormula: 'Math.ceil(sqft / 300)', ratePerHour: 38 },
          { description: 'Pipe, heads & valves', workers: 2, hoursFormula: 'Math.ceil(sqft / 250)', ratePerHour: 40 },
          { description: 'Controller, wire & test', workers: 1, hoursFormula: 'Math.ceil(zones * 1.5)', ratePerHour: 42 },
        ],
        defaultOverhead: [
          { description: 'Trencher rental', costFormula: 'sqft > 2000 ? 350 : 150' },
          { description: 'Pipe cement & primer', costFormula: '40' },
          { description: 'Fuel & vehicle', costFormula: '100' },
        ],
      },
      {
        id: 'sprinkler-repair',
        label: 'Sprinkler Repair / Service',
        measurements: [
          { id: 'zones', label: 'Number of Zones to Service', unit: 'each', placeholder: '4', required: true },
          { id: 'broken_heads', label: 'Broken Heads to Replace', unit: 'each', placeholder: '5', required: false },
        ],
        defaultMaterials: [
          { name: 'Sprinkler Heads (replacement)', category: 'Heads', unit: 'each', baseUnitCost: 8, quantityFormula: '(broken_heads || 0)', notes: '' },
          { name: 'Pipe Fittings & Couplings', category: 'Fittings', unit: 'each', baseUnitCost: 4, quantityFormula: 'Math.ceil((broken_heads || 0) * 1.5)', notes: '' },
          { name: 'PVC Pipe (per section)', category: 'Pipe', unit: 'each', baseUnitCost: 5, quantityFormula: 'Math.ceil((broken_heads || 0) / 2)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Diagnose & test zones', workers: 1, hoursFormula: 'zones * 0.5', ratePerHour: 65 },
          { description: 'Replace heads & repair pipe', workers: 1, hoursFormula: '(broken_heads || 0) * 0.5 + 1', ratePerHour: 65 },
        ],
        defaultOverhead: [
          { description: 'Service call & vehicle', costFormula: '75' },
          { description: 'Miscellaneous parts', costFormula: '25' },
        ],
      },
    ],
  },
  {
    id: 'roofing',
    label: 'Roofing',
    icon: '🏠',
    subTypes: [
      {
        id: 'shingle-replace',
        label: 'Shingle Roof Replacement',
        measurements: [
          { id: 'sqft', label: 'Roof Square Footage', unit: 'sq ft', placeholder: '2000', required: true },
          { id: 'stories', label: 'Number of Stories', unit: 'stories', placeholder: '1', required: true },
          { id: 'pitch', label: 'Roof Pitch (4=low, 6=med, 9=steep)', unit: '', placeholder: '6', required: true },
        ],
        defaultMaterials: [
          { name: 'Architectural Shingles (square)', category: 'Roofing', unit: 'square', baseUnitCost: 98, quantityFormula: 'Math.ceil(sqft / 100 * 1.1)', notes: '+10% waste' },
          { name: 'Roofing Felt 30# (roll=400 sqft)', category: 'Underlayment', unit: 'roll', baseUnitCost: 42, quantityFormula: 'Math.ceil(sqft / 380)', notes: '' },
          { name: 'Ice & Water Shield (roll=200 sqft)', category: 'Underlayment', unit: 'roll', baseUnitCost: 85, quantityFormula: 'Math.ceil(sqft * 0.15 / 180)', notes: 'Eaves & valleys' },
          { name: 'Ridge Cap (bundle)', category: 'Roofing', unit: 'bundle', baseUnitCost: 58, quantityFormula: 'Math.ceil(Math.sqrt(sqft) * 0.5)', notes: '' },
          { name: 'Drip Edge (10 ft)', category: 'Flashing', unit: 'each', baseUnitCost: 4.50, quantityFormula: 'Math.ceil(Math.sqrt(sqft) * 4 / 10)', notes: '' },
          { name: 'Step Flashing (50-pack)', category: 'Flashing', unit: 'pack', baseUnitCost: 28, quantityFormula: 'Math.ceil(sqft / 500)', notes: '' },
          { name: 'Roofing Nails (5 lb box)', category: 'Hardware', unit: 'box', baseUnitCost: 12, quantityFormula: 'Math.ceil(sqft / 200)', notes: '' },
          { name: 'Roof Deck Screws (1 lb)', category: 'Hardware', unit: 'box', baseUnitCost: 8, quantityFormula: 'Math.ceil(sqft / 300)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Tear off & dispose', workers: 3, hoursFormula: 'Math.ceil(sqft / 300 * (pitch / 6))', ratePerHour: 38 },
          { description: 'Install underlayment & flashing', workers: 2, hoursFormula: 'Math.ceil(sqft / 400)', ratePerHour: 40 },
          { description: 'Install shingles & ridge', workers: 3, hoursFormula: 'Math.ceil(sqft / 250 * (pitch / 6))', ratePerHour: 42 },
        ],
        defaultOverhead: [
          { description: 'Dumpster rental', costFormula: 'sqft > 1500 ? 450 : 300' },
          { description: 'Safety equipment', costFormula: '150' },
          { description: 'Fuel & vehicle', costFormula: '125' },
        ],
      },
    ],
  },
  {
    id: 'remodeling',
    label: 'Remodeling',
    icon: '🔨',
    subTypes: [
      {
        id: 'bathroom-remodel',
        label: 'Bathroom Remodel',
        measurements: [
          { id: 'sqft', label: 'Bathroom Square Footage', unit: 'sq ft', placeholder: '60', required: true },
          { id: 'scope', label: 'Scope (1=cosmetic, 2=mid, 3=full gut)', unit: '', placeholder: '2', required: true },
        ],
        defaultMaterials: [
          { name: 'Shower/Tub Tile', category: 'Tile', unit: 'sq ft', baseUnitCost: 5.50, quantityFormula: 'scope >= 2 ? sqft * 2.5 : 0', notes: 'Walls + floor' },
          { name: 'Vanity (36" base)', category: 'Fixtures', unit: 'each', baseUnitCost: 450, quantityFormula: 'scope >= 1 ? 1 : 0', notes: '' },
          { name: 'Toilet (standard)', category: 'Fixtures', unit: 'each', baseUnitCost: 280, quantityFormula: 'scope >= 2 ? 1 : 0', notes: '' },
          { name: 'Shower Door/Enclosure', category: 'Fixtures', unit: 'each', baseUnitCost: 380, quantityFormula: 'scope >= 2 ? 1 : 0', notes: '' },
          { name: 'Faucet & Fixtures Set', category: 'Plumbing', unit: 'set', baseUnitCost: 185, quantityFormula: 'scope >= 1 ? 1 : 0', notes: '' },
          { name: 'Thinset & Grout', category: 'Setting', unit: 'bag', baseUnitCost: 22, quantityFormula: 'scope >= 2 ? Math.ceil(sqft * 0.1) : 0', notes: '' },
          { name: 'Drywall / Cement Board', category: 'Drywall', unit: 'sheet', baseUnitCost: 18, quantityFormula: 'scope >= 2 ? Math.ceil(sqft * 0.3) : 0', notes: '' },
          { name: 'Paint (interior)', category: 'Paint', unit: 'gallon', baseUnitCost: 45, quantityFormula: '2', notes: '' },
          { name: 'Light Fixture', category: 'Electrical', unit: 'each', baseUnitCost: 120, quantityFormula: 'scope >= 1 ? 1 : 0', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & disposal', workers: 2, hoursFormula: 'scope * 8', ratePerHour: 38 },
          { description: 'Tile work', workers: 2, hoursFormula: 'scope >= 2 ? Math.ceil(sqft * 0.3) : 0', ratePerHour: 45 },
          { description: 'Vanity, toilet & plumbing', workers: 1, hoursFormula: 'scope * 8', ratePerHour: 65 },
          { description: 'Paint, fixtures & finish', workers: 2, hoursFormula: 'scope * 6', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Dumpster / disposal', costFormula: 'scope >= 2 ? 250 : 100' },
          { description: 'Permit fees', costFormula: 'scope >= 3 ? 350 : 0' },
          { description: 'Fuel & vehicle', costFormula: '150' },
        ],
      },
      {
        id: 'kitchen-remodel',
        label: 'Kitchen Remodel',
        measurements: [
          { id: 'sqft', label: 'Kitchen Square Footage', unit: 'sq ft', placeholder: '200', required: true },
          { id: 'scope', label: 'Scope (1=cosmetic, 2=mid, 3=full gut)', unit: '', placeholder: '2', required: true },
        ],
        defaultMaterials: [
          { name: 'Countertop (laminate/granite)', category: 'Countertop', unit: 'lin ft', baseUnitCost: 85, quantityFormula: 'scope >= 1 ? Math.ceil(Math.sqrt(sqft) * 2) : 0', notes: '' },
          { name: 'Backsplash Tile', category: 'Tile', unit: 'sq ft', baseUnitCost: 6, quantityFormula: 'scope >= 1 ? Math.ceil(Math.sqrt(sqft) * 8) : 0', notes: '' },
          { name: 'Sink & Faucet Set', category: 'Plumbing', unit: 'set', baseUnitCost: 380, quantityFormula: 'scope >= 2 ? 1 : 0', notes: '' },
          { name: 'Under-cabinet Lighting', category: 'Electrical', unit: 'lin ft', baseUnitCost: 18, quantityFormula: 'scope >= 2 ? Math.ceil(Math.sqrt(sqft)) : 0', notes: '' },
          { name: 'Drywall (sheet)', category: 'Drywall', unit: 'sheet', baseUnitCost: 14, quantityFormula: 'scope >= 3 ? Math.ceil(sqft / 20) : 0', notes: '' },
          { name: 'Paint (interior)', category: 'Paint', unit: 'gallon', baseUnitCost: 45, quantityFormula: 'scope >= 1 ? 3 : 0', notes: '' },
        ],
        defaultLabor: [
          { description: 'Demo & disposal', workers: 2, hoursFormula: 'scope * 12', ratePerHour: 38 },
          { description: 'Countertop & backsplash', workers: 2, hoursFormula: 'scope * 8', ratePerHour: 45 },
          { description: 'Plumbing & electrical', workers: 1, hoursFormula: 'scope * 10', ratePerHour: 70 },
          { description: 'Paint, trim & cleanup', workers: 2, hoursFormula: 'scope * 8', ratePerHour: 35 },
        ],
        defaultOverhead: [
          { description: 'Dumpster', costFormula: 'scope >= 2 ? 350 : 150' },
          { description: 'Permit fees', costFormula: 'scope >= 3 ? 500 : 0' },
          { description: 'Fuel & vehicle', costFormula: '150' },
        ],
      },
    ],
  },
  {
    id: 'tile',
    label: 'Tile (Specialty)',
    icon: '🔲',
    subTypes: [
      {
        id: 'shower-tile',
        label: 'Shower / Tub Surround',
        measurements: [
          { id: 'sqft', label: 'Wall Square Footage', unit: 'sq ft', placeholder: '80', required: true },
          { id: 'floor_sqft', label: 'Floor Square Footage', unit: 'sq ft', placeholder: '16', required: false },
        ],
        defaultMaterials: [
          { name: 'Wall Tile', category: 'Tile', unit: 'sq ft', baseUnitCost: 6, quantityFormula: 'Math.ceil(sqft * 1.12)', notes: '' },
          { name: 'Floor Tile (mosaic)', category: 'Tile', unit: 'sq ft', baseUnitCost: 7, quantityFormula: 'Math.ceil((floor_sqft || 0) * 1.12)', notes: '' },
          { name: 'Cement Board', category: 'Substrate', unit: 'sheet', baseUnitCost: 18, quantityFormula: 'Math.ceil(sqft / 28)', notes: '' },
          { name: 'Thinset Mortar (50 lb)', category: 'Setting', unit: 'bag', baseUnitCost: 22, quantityFormula: 'Math.ceil((sqft + (floor_sqft || 0)) / 35)', notes: '' },
          { name: 'Grout (10 lb)', category: 'Setting', unit: 'bag', baseUnitCost: 18, quantityFormula: 'Math.ceil((sqft + (floor_sqft || 0)) / 45)', notes: '' },
          { name: 'Waterproof Membrane', category: 'Waterproofing', unit: 'sq ft', baseUnitCost: 1.20, quantityFormula: 'sqft + (floor_sqft || 0)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Cement board & waterproof', workers: 1, hoursFormula: 'Math.ceil(sqft / 40)', ratePerHour: 42 },
          { description: 'Set wall & floor tile', workers: 1, hoursFormula: 'Math.ceil((sqft + (floor_sqft || 0)) / 25)', ratePerHour: 50 },
          { description: 'Grout, caulk & seal', workers: 1, hoursFormula: 'Math.ceil((sqft + (floor_sqft || 0)) / 60)', ratePerHour: 45 },
        ],
        defaultOverhead: [
          { description: 'Tile saw & tools', costFormula: '95' },
          { description: 'Fuel & vehicle', costFormula: '50' },
        ],
      },
    ],
  },
  {
    id: 'insulation',
    label: 'Insulation',
    icon: '🧱',
    subTypes: [
      {
        id: 'attic-insulation',
        label: 'Attic Insulation (Blown-in)',
        measurements: [
          { id: 'sqft', label: 'Attic Square Footage', unit: 'sq ft', placeholder: '1200', required: true },
          { id: 'r_value', label: 'Target R-Value', unit: 'R-', placeholder: '38', required: true },
        ],
        defaultMaterials: [
          { name: 'Blown Cellulose Insulation (bag)', category: 'Insulation', unit: 'bag', baseUnitCost: 22, quantityFormula: 'Math.ceil(sqft * (r_value / 2.8) / 40)', notes: '~2.8 R per inch' },
          { name: 'Vapor Barrier (roll)', category: 'Barrier', unit: 'roll', baseUnitCost: 35, quantityFormula: 'Math.ceil(sqft / 500)', notes: '' },
          { name: 'Rafter Baffles', category: 'Ventilation', unit: 'each', baseUnitCost: 1.50, quantityFormula: 'Math.ceil(sqft / 16)', notes: '16" OC' },
        ],
        defaultLabor: [
          { description: 'Air seal & baffle install', workers: 1, hoursFormula: 'Math.ceil(sqft / 300)', ratePerHour: 38 },
          { description: 'Blow insulation', workers: 2, hoursFormula: 'Math.ceil(sqft / 400)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Blower machine rental', costFormula: '75' },
          { description: 'PPE & supplies', costFormula: '50' },
          { description: 'Fuel & vehicle', costFormula: '60' },
        ],
      },
    ],
  },
  {
    id: 'gutters',
    label: 'Gutters & Drainage',
    icon: '🌧️',
    subTypes: [
      {
        id: 'gutter-install',
        label: 'Gutter Installation',
        measurements: [
          { id: 'lf', label: 'Linear Feet of Gutter', unit: 'lin ft', placeholder: '150', required: true },
          { id: 'downspouts', label: 'Number of Downspouts', unit: 'each', placeholder: '4', required: true },
          { id: 'stories', label: 'Number of Stories', unit: 'stories', placeholder: '1', required: true },
        ],
        defaultMaterials: [
          { name: '6" K-Style Gutter (10 ft)', category: 'Gutters', unit: 'each', baseUnitCost: 12, quantityFormula: 'Math.ceil(lf / 10 * 1.05)', notes: '' },
          { name: 'Downspout (10 ft)', category: 'Gutters', unit: 'each', baseUnitCost: 10, quantityFormula: 'downspouts * 2 * stories', notes: '' },
          { name: 'End Caps (pair)', category: 'Hardware', unit: 'pair', baseUnitCost: 6, quantityFormula: 'Math.ceil(lf / 40)', notes: '' },
          { name: 'Gutter Hangers', category: 'Hardware', unit: 'each', baseUnitCost: 1.50, quantityFormula: 'Math.ceil(lf / 2)', notes: 'Every 2 ft' },
          { name: 'Downspout Elbows', category: 'Hardware', unit: 'each', baseUnitCost: 4, quantityFormula: 'downspouts * 2', notes: '' },
          { name: 'Gutter Sealant', category: 'Supplies', unit: 'tube', baseUnitCost: 8, quantityFormula: 'Math.ceil(lf / 50)', notes: '' },
          { name: 'Gutter Guards (optional)', category: 'Guards', unit: 'lin ft', baseUnitCost: 2.50, quantityFormula: 'lf', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove old gutters', workers: 1, hoursFormula: 'Math.ceil(lf / 40)', ratePerHour: 35 },
          { description: 'Install gutters & downspouts', workers: 2, hoursFormula: 'Math.ceil(lf / 30 * stories)', ratePerHour: 38 },
        ],
        defaultOverhead: [
          { description: 'Ladders & equipment', costFormula: 'stories > 1 ? 100 : 50' },
          { description: 'Fuel & vehicle', costFormula: '60' },
        ],
      },
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: '⚡',
    subTypes: [
      {
        id: 'panel-upgrade',
        label: 'Panel Upgrade / Service',
        measurements: [
          { id: 'amps', label: 'New Panel Size (amps)', unit: 'amps', placeholder: '200', required: true },
          { id: 'circuits', label: 'Number of New Circuits', unit: 'each', placeholder: '4', required: false },
        ],
        defaultMaterials: [
          { name: 'Main Panel (200A)', category: 'Panel', unit: 'each', baseUnitCost: 450, quantityFormula: '1', notes: '' },
          { name: 'Circuit Breakers', category: 'Electrical', unit: 'each', baseUnitCost: 12, quantityFormula: '(circuits || 0) + 20', notes: '' },
          { name: 'Service Entrance Cable (per ft)', category: 'Wire', unit: 'lin ft', baseUnitCost: 3.50, quantityFormula: '50', notes: '' },
          { name: 'Ground Rods & Wire', category: 'Grounding', unit: 'set', baseUnitCost: 45, quantityFormula: '1', notes: '' },
          { name: 'Conduit & Fittings', category: 'Conduit', unit: 'lot', baseUnitCost: 85, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Shut off, remove & install panel', workers: 1, hoursFormula: '8', ratePerHour: 90 },
          { description: 'New circuit wiring', workers: 1, hoursFormula: '(circuits || 0) * 3', ratePerHour: 85 },
          { description: 'Inspection prep & test', workers: 1, hoursFormula: '3', ratePerHour: 85 },
        ],
        defaultOverhead: [
          { description: 'Permit fees', costFormula: '250' },
          { description: 'Tools & equipment', costFormula: '100' },
          { description: 'Vehicle & fuel', costFormula: '75' },
        ],
      },
    ],
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    icon: '🔧',
    subTypes: [
      {
        id: 'water-heater',
        label: 'Water Heater Replacement',
        measurements: [
          { id: 'gallons', label: 'Tank Size (gallons)', unit: 'gallons', placeholder: '50', required: true },
          { id: 'type', label: 'Type (1=standard, 2=tankless, 3=heat pump)', unit: '', placeholder: '1', required: true },
        ],
        defaultMaterials: [
          { name: 'Water Heater (standard 50 gal)', category: 'Equipment', unit: 'each', baseUnitCost: 650, quantityFormula: 'type === 1 ? 1 : 0', notes: '' },
          { name: 'Tankless Water Heater', category: 'Equipment', unit: 'each', baseUnitCost: 950, quantityFormula: 'type === 2 ? 1 : 0', notes: '' },
          { name: 'Heat Pump Water Heater', category: 'Equipment', unit: 'each', baseUnitCost: 1350, quantityFormula: 'type === 3 ? 1 : 0', notes: '' },
          { name: 'Supply Lines & Connectors', category: 'Plumbing', unit: 'set', baseUnitCost: 35, quantityFormula: '1', notes: '' },
          { name: 'T&P Valve & Drain Pan', category: 'Plumbing', unit: 'set', baseUnitCost: 28, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove old & install new heater', workers: 1, hoursFormula: '4', ratePerHour: 85 },
          { description: 'Connect gas/electric & test', workers: 1, hoursFormula: '2', ratePerHour: 85 },
        ],
        defaultOverhead: [
          { description: 'Disposal of old unit', costFormula: '50' },
          { description: 'Vehicle & fuel', costFormula: '60' },
        ],
      },
      {
        id: 'bathroom-plumbing',
        label: 'Bathroom Plumbing Rough-In',
        measurements: [
          { id: 'fixtures', label: 'Number of Fixtures', unit: 'each', placeholder: '3', required: true },
          { id: 'lf_pipe', label: 'Linear Feet of New Pipe', unit: 'lin ft', placeholder: '50', required: false },
        ],
        defaultMaterials: [
          { name: 'PEX Pipe (1/2" per 100ft)', category: 'Pipe', unit: 'roll', baseUnitCost: 55, quantityFormula: 'Math.ceil((lf_pipe || 50) / 100)', notes: '' },
          { name: 'PEX Fittings & Connections', category: 'Fittings', unit: 'bag', baseUnitCost: 28, quantityFormula: 'Math.ceil(fixtures * 2)', notes: '' },
          { name: 'ABS Drain Pipe (10 ft)', category: 'Drain', unit: 'each', baseUnitCost: 18, quantityFormula: 'Math.ceil((lf_pipe || 50) / 10)', notes: '' },
          { name: 'P-Traps & Cleanouts', category: 'Drain', unit: 'each', baseUnitCost: 12, quantityFormula: 'fixtures', notes: '' },
        ],
        defaultLabor: [
          { description: 'Rough-in supply lines', workers: 1, hoursFormula: 'fixtures * 3', ratePerHour: 85 },
          { description: 'Drain & vent rough-in', workers: 1, hoursFormula: 'fixtures * 2.5', ratePerHour: 85 },
        ],
        defaultOverhead: [
          { description: 'Permit fees', costFormula: '150' },
          { description: 'Tools & vehicle', costFormula: '100' },
        ],
      },
    ],
  },
  {
    id: 'pool',
    label: 'Pool Cleaning & Maintenance',
    icon: '🏊',
    subTypes: [
      {
        id: 'pool-opening',
        label: 'Pool Opening (Seasonal)',
        measurements: [
          { id: 'gallons', label: 'Pool Volume', unit: 'gallons', placeholder: '20000', required: true },
          { id: 'cover_type', label: 'Cover Type (1=none, 2=mesh, 3=solid)', unit: '', placeholder: '1', required: true },
          { id: 'water_features', label: 'Number of Water Features', unit: 'each', placeholder: '0', required: false },
          { id: 'spa', label: 'Attached Spa (0=no, 1=yes)', unit: '', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Opening Chemical Kit (shock, algaecide, clarifier, stain inhibitor)', category: 'Chemicals', unit: 'kit', baseUnitCost: 58, quantityFormula: 'Math.max(1, Math.ceil(gallons / 20000))', notes: 'Adjust for pool size and condition' },
          { name: 'Muriatic Acid / pH Down (1 gal)', category: 'Chemicals', unit: 'gal', baseUnitCost: 14, quantityFormula: '1', notes: '' },
          { name: 'Alkalinity Increaser (5 lb)', category: 'Chemicals', unit: 'bag', baseUnitCost: 18, quantityFormula: '1', notes: '' },
          { name: 'Pool Shock (1 lb bag)', category: 'Chemicals', unit: 'bag', baseUnitCost: 5, quantityFormula: 'Math.ceil(gallons / 10000) * 2', notes: '2 lbs per 10k gallons' },
          { name: 'Expansion Plugs (set)', category: 'Hardware', unit: 'set', baseUnitCost: 15, quantityFormula: '1', notes: '' },
          { name: 'Cover Cleaning Supplies', category: 'Supplies', unit: 'lot', baseUnitCost: 25, quantityFormula: 'cover_type > 1 ? 1 : 0', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove cover, scrub & debris removal', workers: 1, hoursFormula: 'cover_type === 3 ? 3 : cover_type === 2 ? 2 : 1.5', ratePerHour: 28 },
          { description: 'Start equipment, fill & initial test', workers: 1, hoursFormula: '2', ratePerHour: 28 },
          { description: 'Balance water chemistry & inspect equipment', workers: 1, hoursFormula: '1', ratePerHour: 28 },
          { description: 'Water feature startup', workers: 1, hoursFormula: '(water_features || 0) * 1', ratePerHour: 28 },
          { description: 'Spa startup & chemistry treatment', workers: 1, hoursFormula: '(spa || 0) * 1.5', ratePerHour: 28 },
        ],
        defaultOverhead: [
          { description: 'Cover clean & storage fee', costFormula: 'cover_type > 1 ? 185 : 0' },
          { description: 'Vehicle & fuel', costFormula: '65' },
          { description: 'Test kit & small supplies', costFormula: '20' },
        ],
      },
      {
        id: 'pool-closing',
        label: 'Pool Closing / Winterization',
        measurements: [
          { id: 'gallons', label: 'Pool Volume', unit: 'gallons', placeholder: '20000', required: true },
          { id: 'cover_type', label: 'Cover (1=solid tarp, 2=mesh safety, 3=none)', unit: '', placeholder: '1', required: true },
          { id: 'water_features', label: 'Number of Water Features', unit: 'each', placeholder: '0', required: false },
          { id: 'spa_type', label: 'Spa Type (0=none, 1=portable, 2=inground)', unit: '', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Winter Chemical Kit (algaecide, shock, stain inhibitor)', category: 'Chemicals', unit: 'kit', baseUnitCost: 40, quantityFormula: 'Math.max(1, Math.ceil(gallons / 20000))', notes: '' },
          { name: 'Pool-Grade Antifreeze (1 gal)', category: 'Chemicals', unit: 'gal', baseUnitCost: 14, quantityFormula: 'Math.ceil(gallons / 8000) + 2', notes: '~1 gal per 8k gallons of lines' },
          { name: 'Expansion Plugs (set)', category: 'Hardware', unit: 'set', baseUnitCost: 15, quantityFormula: '1', notes: '' },
          { name: 'Air Pillow (cover support)', category: 'Supplies', unit: 'each', baseUnitCost: 20, quantityFormula: 'cover_type === 1 ? Math.ceil(gallons / 15000) : 0', notes: '' },
          { name: 'Cover Bags / Water Weights (set)', category: 'Supplies', unit: 'set', baseUnitCost: 28, quantityFormula: 'cover_type === 1 ? 1 : 0', notes: '' },
        ],
        defaultLabor: [
          { description: 'Vacuum pool & lower water level', workers: 1, hoursFormula: 'Math.max(1.5, Math.ceil(gallons / 8000))', ratePerHour: 28 },
          { description: 'Blow out plumbing lines & add antifreeze', workers: 1, hoursFormula: '2', ratePerHour: 28 },
          { description: 'Add winter chemicals & install cover', workers: 1, hoursFormula: '1.5', ratePerHour: 28 },
          { description: 'Winterize water features', workers: 1, hoursFormula: '(water_features || 0) * 1', ratePerHour: 28 },
          { description: 'Winterize portable spa', workers: 1, hoursFormula: '(spa_type || 0) === 1 ? 1.5 : 0', ratePerHour: 28 },
          { description: 'Winterize inground spa', workers: 1, hoursFormula: '(spa_type || 0) === 2 ? 2.5 : 0', ratePerHour: 28 },
        ],
        defaultOverhead: [
          { description: 'Vehicle & fuel', costFormula: '65' },
          { description: 'Miscellaneous plugs & fittings', costFormula: '30' },
          { description: 'Leaf removal before covering', costFormula: '65' },
        ],
      },
      {
        id: 'pool-maintenance',
        label: 'Regular Maintenance (Monthly)',
        measurements: [
          { id: 'gallons', label: 'Pool Volume', unit: 'gallons', placeholder: '20000', required: true },
          { id: 'visits', label: 'Visits per Month', unit: 'each', placeholder: '4', required: true },
          { id: 'saltwater', label: 'Saltwater Pool (0=no, 1=yes)', unit: '', placeholder: '0', required: false },
          { id: 'spa', label: 'Spa Service (0=no, 1=yes)', unit: '', placeholder: '0', required: false },
          { id: 'vacuum_addon', label: 'Manual Vacuum Add-on (0=no, 1=yes)', unit: '', placeholder: '0', required: false },
          { id: 'water_features', label: 'Water Features', unit: 'each', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Chlorine Tablets / Pucks (10 lb bucket)', category: 'Chemicals', unit: 'bucket', baseUnitCost: 42, quantityFormula: 'Math.max(1, Math.ceil(gallons / 15000 * visits / 4))', notes: 'Monthly consumption estimate' },
          { name: 'Pool Shock (1 lb bag)', category: 'Chemicals', unit: 'bag', baseUnitCost: 5, quantityFormula: 'visits', notes: '1 bag per visit' },
          { name: 'Algaecide (qt)', category: 'Chemicals', unit: 'qt', baseUnitCost: 18, quantityFormula: 'Math.ceil(visits / 4)', notes: 'Monthly' },
          { name: 'pH Balance Bundle (up/down)', category: 'Chemicals', unit: 'set', baseUnitCost: 22, quantityFormula: '1', notes: '' },
          { name: 'Clarifier (qt)', category: 'Chemicals', unit: 'qt', baseUnitCost: 12, quantityFormula: 'Math.ceil(visits / 8)', notes: '' },
          { name: 'Pool Salt (40 lb bag)', category: 'Chemicals', unit: 'bag', baseUnitCost: 12, quantityFormula: 'saltwater ? Math.ceil(gallons / 40000) : 0', notes: 'Saltwater pools only' },
          { name: 'Phosphate Remover (qt)', category: 'Chemicals', unit: 'qt', baseUnitCost: 18, quantityFormula: '(saltwater || 0)', notes: 'Saltwater/monthly' },
        ],
        defaultLabor: [
          { description: 'Weekly service: skim, brush, test & treat, empty baskets', workers: 1, hoursFormula: 'visits * 0.5', ratePerHour: 28 },
          { description: 'Salt pool: cell inspection, phosphate & salt test', workers: 1, hoursFormula: '(saltwater || 0) * Math.ceil(visits / 2) * 0.2', ratePerHour: 28 },
          { description: 'Spa service: test, treat, partial drain & clean', workers: 1, hoursFormula: '(spa || 0) * visits * 0.3', ratePerHour: 28 },
          { description: 'Manual vacuum & brush corners', workers: 1, hoursFormula: '(vacuum_addon || 0) * visits * 0.5', ratePerHour: 28 },
          { description: 'Water feature maintenance', workers: 1, hoursFormula: '(water_features || 0) * Math.ceil(visits / 2) * 0.15', ratePerHour: 28 },
        ],
        defaultOverhead: [
          { description: 'Vehicle & fuel (monthly)', costFormula: '60' },
          { description: 'Test strips, brushes & small supplies', costFormula: '15' },
          { description: 'Equipment wear allocation', costFormula: '20' },
        ],
      },
      {
        id: 'pool-repair',
        label: 'Equipment Repair & Replacement',
        measurements: [
          { id: 'pump_job', label: 'Pump Job (0=none, 1=repair, 2=replace variable-speed)', unit: '', placeholder: '0', required: false },
          { id: 'heater_job', label: 'Heater Job (0=none, 1=gas repair, 2=heat pump repair, 3=heat exchanger)', unit: '', placeholder: '0', required: false },
          { id: 'filter_type', label: 'Filter Service (0=none, 1=sand, 2=cartridge, 3=DE)', unit: '', placeholder: '0', required: false },
          { id: 'light_job', label: 'Light Job (0=none, 1=seal repair, 2=replace LED)', unit: '', placeholder: '0', required: false },
          { id: 'salt_cell', label: 'Salt Cell Replacements', unit: 'each', placeholder: '0', required: false },
          { id: 'plumb_repair', label: 'Plumbing Leak Repairs', unit: 'each', placeholder: '0', required: false },
        ],
        defaultMaterials: [
          { name: 'Pump Repair Parts (seal, capacitor, impeller)', category: 'Pump', unit: 'job', baseUnitCost: 350, quantityFormula: 'pump_job === 1 ? 1 : 0', notes: '' },
          { name: 'Variable-Speed Pump (installed unit)', category: 'Pump', unit: 'each', baseUnitCost: 1800, quantityFormula: 'pump_job === 2 ? 1 : 0', notes: 'VS pump saves 50–90% on energy vs single-speed' },
          { name: 'Gas Heater Repair Parts', category: 'Heater', unit: 'job', baseUnitCost: 550, quantityFormula: 'heater_job === 1 ? 1 : 0', notes: '' },
          { name: 'Heat Pump Repair Parts', category: 'Heater', unit: 'job', baseUnitCost: 450, quantityFormula: 'heater_job === 2 ? 1 : 0', notes: '' },
          { name: 'Heat Exchanger (replacement)', category: 'Heater', unit: 'each', baseUnitCost: 1600, quantityFormula: 'heater_job === 3 ? 1 : 0', notes: '' },
          { name: 'Sand Filter Media (replacement)', category: 'Filter', unit: 'set', baseUnitCost: 175, quantityFormula: 'filter_type === 1 ? 1 : 0', notes: 'Replace every 5–7 years' },
          { name: 'Cartridge Filter Set (4-pack)', category: 'Filter', unit: 'set', baseUnitCost: 350, quantityFormula: 'filter_type === 2 ? 1 : 0', notes: 'Replace every 2–3 years' },
          { name: 'DE Filter Grids (full set)', category: 'Filter', unit: 'set', baseUnitCost: 450, quantityFormula: 'filter_type === 3 ? 1 : 0', notes: '' },
          { name: 'Pool Light Seal / Gasket Kit', category: 'Lighting', unit: 'each', baseUnitCost: 55, quantityFormula: 'light_job === 1 ? 1 : 0', notes: 'VGB-compliant' },
          { name: 'LED Pool Light Fixture (w/ niche)', category: 'Lighting', unit: 'each', baseUnitCost: 400, quantityFormula: 'light_job === 2 ? 1 : 0', notes: 'Must be installed by licensed electrician' },
          { name: 'Salt Cell Replacement (40k gal)', category: 'Saltwater', unit: 'each', baseUnitCost: 850, quantityFormula: '(salt_cell || 0)', notes: 'Typical lifespan 3–5 years' },
          { name: 'Plumbing Repair Supplies (PVC, fittings)', category: 'Plumbing', unit: 'job', baseUnitCost: 85, quantityFormula: '(plumb_repair || 0)', notes: '' },
        ],
        defaultLabor: [
          { description: 'Pump repair (seals, capacitor, impeller)', workers: 1, hoursFormula: 'pump_job === 1 ? 3 : 0', ratePerHour: 85 },
          { description: 'Variable-speed pump replacement', workers: 1, hoursFormula: 'pump_job === 2 ? 5 : 0', ratePerHour: 85 },
          { description: 'Gas/heat pump heater repair', workers: 1, hoursFormula: 'heater_job === 1 ? 4 : heater_job === 2 ? 3 : 0', ratePerHour: 85 },
          { description: 'Heat exchanger replacement', workers: 1, hoursFormula: 'heater_job === 3 ? 8 : 0', ratePerHour: 85 },
          { description: 'Filter service / media replacement', workers: 1, hoursFormula: 'filter_type > 0 ? 2 : 0', ratePerHour: 85 },
          { description: 'Pool light seal repair', workers: 1, hoursFormula: 'light_job === 1 ? 1.5 : 0', ratePerHour: 85 },
          { description: 'LED light fixture replacement', workers: 1, hoursFormula: 'light_job === 2 ? 2.5 : 0', ratePerHour: 90 },
          { description: 'Salt cell replacement', workers: 1, hoursFormula: '(salt_cell || 0) * 1.5', ratePerHour: 85 },
          { description: 'Plumbing leak repair', workers: 1, hoursFormula: '(plumb_repair || 0) * 3', ratePerHour: 85 },
        ],
        defaultOverhead: [
          { description: 'Diagnostic / service call', costFormula: '85' },
          { description: 'Tools & equipment', costFormula: '50' },
          { description: 'Vehicle & fuel', costFormula: '75' },
          { description: 'Electrical permit (light/pump replacement)', costFormula: 'light_job === 2 || pump_job === 2 ? 150 : 0' },
        ],
      },
    ],
  },
  {
    id: 'hvac',
    label: 'HVAC',
    icon: '❄️',
    subTypes: [
      {
        id: 'ac-replace',
        label: 'AC Unit Replacement',
        measurements: [
          { id: 'tons', label: 'System Size (tons)', unit: 'tons', placeholder: '3', required: true },
          { id: 'stories', label: 'Number of Stories', unit: 'stories', placeholder: '1', required: true },
        ],
        defaultMaterials: [
          { name: 'AC Condenser Unit', category: 'HVAC', unit: 'each', baseUnitCost: 1200, quantityFormula: '1', notes: `${3} ton` },
          { name: 'Air Handler / Coil', category: 'HVAC', unit: 'each', baseUnitCost: 850, quantityFormula: '1', notes: '' },
          { name: 'Refrigerant (R-410A per lb)', category: 'Refrigerant', unit: 'lb', baseUnitCost: 18, quantityFormula: 'tons * 3', notes: '' },
          { name: 'Thermostat (smart)', category: 'Controls', unit: 'each', baseUnitCost: 175, quantityFormula: '1', notes: '' },
          { name: 'Disconnect Box & Wiring', category: 'Electrical', unit: 'lot', baseUnitCost: 85, quantityFormula: '1', notes: '' },
          { name: 'Pad & Refrigerant Line Set', category: 'Installation', unit: 'lot', baseUnitCost: 120, quantityFormula: '1', notes: '' },
        ],
        defaultLabor: [
          { description: 'Remove old unit', workers: 2, hoursFormula: '3', ratePerHour: 85 },
          { description: 'Install condenser, handler & lines', workers: 2, hoursFormula: 'stories * 6', ratePerHour: 90 },
          { description: 'Charge, test & commission', workers: 1, hoursFormula: '3', ratePerHour: 95 },
        ],
        defaultOverhead: [
          { description: 'Permit & inspection', costFormula: '250' },
          { description: 'Equipment & recovery machine', costFormula: '150' },
          { description: 'Vehicle & fuel', costFormula: '100' },
        ],
      },
    ],
  },
]

export const getProjectTypeById = (id: string) =>
  PROJECT_TYPES.find(pt => pt.id === id)

export const getSubTypeById = (projectTypeId: string, subTypeId: string) => {
  const pt = getProjectTypeById(projectTypeId)
  return pt?.subTypes.find(st => st.id === subTypeId)
}

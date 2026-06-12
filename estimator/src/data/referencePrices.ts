export interface RefEntry {
  kw: string[]
  unit: string
  low: number
  mid: number
  high: number
  note?: string
}

export const REF_MATERIALS: RefEntry[] = [
  // ── Lumber & Framing ──
  { kw: ['2x4', '2 x 4', 'stud', 'framing stud'], unit: 'ea', low: 4, mid: 6, high: 9, note: '8 ft stud' },
  { kw: ['2x6', '2 x 6', 'wall plate', 'rafter'], unit: 'ea', low: 8, mid: 12, high: 18 },
  { kw: ['2x8', '2 x 8', 'joist', 'ledger'], unit: 'ea', low: 12, mid: 18, high: 26 },
  { kw: ['2x10', '2 x 10', 'floor joist'], unit: 'ea', low: 16, mid: 24, high: 34 },
  { kw: ['2x12', '2 x 12', 'stair stringer'], unit: 'ea', low: 22, mid: 32, high: 46 },
  { kw: ['4x4', '4 x 4', 'post', 'fence post wood'], unit: 'ea', low: 10, mid: 16, high: 24 },
  { kw: ['4x6', '4 x 6', 'beam post'], unit: 'ea', low: 18, mid: 28, high: 42 },
  { kw: ['plywood', '3/4 plywood', '3/4" plywood', 'sheathing ply'], unit: 'ea', low: 42, mid: 58, high: 80, note: '4×8 sheet' },
  { kw: ['osb', 'oriented strand board', '7/16 osb', 'osb sheathing'], unit: 'ea', low: 18, mid: 26, high: 38, note: '4×8 sheet' },
  { kw: ['lvl', 'lvl beam', 'laminated veneer', 'engineered beam'], unit: 'lf', low: 2.50, mid: 4, high: 6.50 },
  { kw: ['engineered joist', 'i-joist', 'tji', 'floor truss'], unit: 'lf', low: 3, mid: 5, high: 8 },
  { kw: ['treated lumber', 'pressure treated', 'pt lumber', 'deck board'], unit: 'lf', low: 1.50, mid: 2.50, high: 4 },

  // ── Drywall ──
  { kw: ['drywall', 'sheetrock', '1/2 drywall', '4x8 drywall'], unit: 'ea', low: 12, mid: 17, high: 25, note: '4×8 sheet' },
  { kw: ['5/8 drywall', 'type x drywall', 'fire drywall'], unit: 'ea', low: 15, mid: 21, high: 30, note: '4×8 sheet' },
  { kw: ['drywall compound', 'joint compound', 'mud', 'drywall mud'], unit: 'ea', low: 18, mid: 25, high: 40, note: '5-gal bucket' },
  { kw: ['drywall tape', 'paper tape', 'mesh tape'], unit: 'roll', low: 8, mid: 12, high: 18 },
  { kw: ['corner bead', 'metal corner', 'vinyl corner'], unit: 'ea', low: 2, mid: 4, high: 7 },

  // ── Concrete & Masonry ──
  { kw: ['concrete bag', 'quikrete', 'concrete mix', 'premix concrete', '60 lb', '80 lb bag'], unit: 'bag', low: 6, mid: 9, high: 14 },
  { kw: ['ready mix', 'concrete yard', 'concrete cy', 'redi-mix', 'transit mix'], unit: 'cy', low: 140, mid: 185, high: 260 },
  { kw: ['rebar', '#4 rebar', 'deformed bar', 're-bar'], unit: 'lf', low: 0.80, mid: 1.20, high: 1.80 },
  { kw: ['concrete block', 'cmu', 'cinder block', '8 inch block'], unit: 'ea', low: 2, mid: 3, high: 4.50 },
  { kw: ['cement board', 'hardiboard', 'wonderboard', 'tile backer'], unit: 'ea', low: 15, mid: 22, high: 30, note: '3×5 sheet' },
  { kw: ['wire mesh', 'welded wire', 'remesh', 'concrete mesh'], unit: 'sf', low: 0.20, mid: 0.40, high: 0.65 },
  { kw: ['brick', 'face brick', 'standard brick'], unit: 'ea', low: 0.50, mid: 0.80, high: 1.30 },
  { kw: ['mortar', 'mortar mix', 'type s', 'type n mortar'], unit: 'bag', low: 8, mid: 13, high: 20 },

  // ── Roofing ──
  { kw: ['3-tab shingle', '3 tab', 'asphalt shingle basic'], unit: 'sq', low: 90, mid: 120, high: 165 },
  { kw: ['architectural shingle', 'dimensional shingle', 'laminated shingle'], unit: 'sq', low: 125, mid: 170, high: 225 },
  { kw: ['roofing felt', '15 lb felt', '30 lb felt', 'tar paper'], unit: 'roll', low: 30, mid: 45, high: 65 },
  { kw: ['ice water shield', 'ice dam', 'self-adhering', 'peel stick membrane'], unit: 'sq', low: 65, mid: 95, high: 140 },
  { kw: ['ridge cap', 'ridge shingle', 'hip ridge'], unit: 'ea', low: 35, mid: 55, high: 80 },
  { kw: ['drip edge', 'starter strip', 'eave drip'], unit: 'lf', low: 2, mid: 3.50, high: 5 },
  { kw: ['roof vent', 'ridge vent', 'soffit vent'], unit: 'ea', low: 12, mid: 25, high: 48 },
  { kw: ['flashing', 'step flashing', 'counter flashing', 'valley flashing'], unit: 'lf', low: 2, mid: 4, high: 7 },
  { kw: ['decking', 'roof deck', 'osb deck', '7/16 roof'], unit: 'sf', low: 0.50, mid: 0.80, high: 1.20 },

  // ── Fencing ──
  { kw: ['wood fence board', 'cedar fence', 'dog ear', 'privacy board'], unit: 'ea', low: 8, mid: 13, high: 20 },
  { kw: ['chain link', 'chain-link', 'galvanized fence fabric'], unit: 'sf', low: 1.50, mid: 2.80, high: 4.50 },
  { kw: ['vinyl fence', 'pvc fence panel', 'white fence panel'], unit: 'ea', low: 38, mid: 60, high: 90, note: '6 ft panel' },
  { kw: ['metal post', 'fence post steel', 'channel post'], unit: 'ea', low: 15, mid: 25, high: 40 },
  { kw: ['fence gate', 'walk gate', 'drive gate'], unit: 'ea', low: 150, mid: 300, high: 600 },
  { kw: ['fence rail', 'fence stringer', 'top rail'], unit: 'lf', low: 2, mid: 3.50, high: 5.50 },

  // ── Flooring ──
  { kw: ['vinyl plank', 'lvp', 'luxury vinyl plank', 'click vinyl'], unit: 'sf', low: 1.80, mid: 3, high: 5 },
  { kw: ['laminate flooring', 'laminate floor'], unit: 'sf', low: 1.50, mid: 2.80, high: 4.50 },
  { kw: ['hardwood floor', 'engineered hardwood', 'solid hardwood', 'oak floor', 'maple floor'], unit: 'sf', low: 4, mid: 7, high: 12 },
  { kw: ['carpet', 'broadloom', 'carpet tile'], unit: 'sf', low: 1.50, mid: 3, high: 5 },
  { kw: ['carpet pad', 'foam pad', 'carpet cushion'], unit: 'sf', low: 0.50, mid: 1, high: 1.80 },
  { kw: ['flooring underlayment', 'floor underlayment', 'vapor barrier'], unit: 'sf', low: 0.25, mid: 0.45, high: 0.80 },
  { kw: ['transition strip', 'reducer strip', 't-molding', 'threshold'], unit: 'ea', low: 12, mid: 22, high: 40 },
  { kw: ['baseboards', 'base molding', 'base trim', 'quarter round'], unit: 'lf', low: 0.80, mid: 1.50, high: 2.80 },

  // ── Tile ──
  { kw: ['ceramic tile', 'floor tile', 'wall tile', '12x12 tile'], unit: 'sf', low: 1.50, mid: 3.50, high: 6 },
  { kw: ['porcelain tile', 'rectified tile', '24x24 tile'], unit: 'sf', low: 3, mid: 6.50, high: 14 },
  { kw: ['subway tile', '3x6 tile', 'metro tile'], unit: 'sf', low: 2, mid: 4, high: 7 },
  { kw: ['mosaic tile', 'glass tile', 'penny tile'], unit: 'sf', low: 4, mid: 9, high: 20 },
  { kw: ['thinset', 'tile adhesive', 'modified mortar', 'tile mortar'], unit: 'bag', low: 20, mid: 30, high: 45 },
  { kw: ['grout', 'tile grout', 'sanded grout', 'unsanded grout'], unit: 'bag', low: 15, mid: 22, high: 35 },
  { kw: ['tile spacer', 'grout spacer'], unit: 'bag', low: 3, mid: 6, high: 10 },

  // ── Paint ──
  { kw: ['interior paint', 'wall paint', 'latex paint', 'flat paint', 'eggshell paint', 'satin paint'], unit: 'gal', low: 28, mid: 45, high: 75 },
  { kw: ['exterior paint', 'house paint', 'exterior latex'], unit: 'gal', low: 35, mid: 58, high: 90 },
  { kw: ['primer', 'paint primer', 'drywall primer', 'wall primer'], unit: 'gal', low: 20, mid: 35, high: 55 },
  { kw: ['paint roller', 'paint tray', 'roller cover'], unit: 'ea', low: 5, mid: 12, high: 28 },
  { kw: ['paint brush', 'paintbrush', 'brush'], unit: 'ea', low: 5, mid: 14, high: 30 },
  { kw: ['caulk', 'caulking', 'silicone caulk', 'painter caulk'], unit: 'tube', low: 4, mid: 7, high: 14 },

  // ── Windows & Doors ──
  { kw: ['vinyl window', 'double hung window', 'replacement window'], unit: 'ea', low: 180, mid: 350, high: 700 },
  { kw: ['casement window', 'crank window'], unit: 'ea', low: 260, mid: 480, high: 950 },
  { kw: ['sliding window', 'horizontal slider'], unit: 'ea', low: 200, mid: 380, high: 700 },
  { kw: ['interior door', 'pre-hung door', 'hollow core', 'solid core door'], unit: 'ea', low: 120, mid: 230, high: 450 },
  { kw: ['exterior door', 'entry door', 'fiberglass door', 'steel door'], unit: 'ea', low: 280, mid: 550, high: 1100 },
  { kw: ['sliding glass door', 'patio door', 'french door'], unit: 'ea', low: 450, mid: 900, high: 2000 },
  { kw: ['door hardware', 'door knob', 'lever handle', 'lockset'], unit: 'ea', low: 25, mid: 60, high: 140 },
  { kw: ['window trim', 'door casing', 'casing', 'window casing'], unit: 'lf', low: 1, mid: 2, high: 3.50 },

  // ── Cabinets & Countertops ──
  { kw: ['base cabinet', 'base cab', 'lower cabinet'], unit: 'ea', low: 150, mid: 300, high: 600 },
  { kw: ['wall cabinet', 'upper cabinet', 'wall cab'], unit: 'ea', low: 130, mid: 260, high: 520 },
  { kw: ['tall cabinet', 'pantry cabinet', 'utility cabinet'], unit: 'ea', low: 280, mid: 500, high: 1000 },
  { kw: ['countertop laminate', 'formica', 'laminate counter'], unit: 'lf', low: 25, mid: 45, high: 75 },
  { kw: ['granite countertop', 'granite slab', 'stone counter'], unit: 'sf', low: 55, mid: 90, high: 160 },
  { kw: ['quartz countertop', 'quartz slab', 'engineered stone'], unit: 'sf', low: 65, mid: 115, high: 200 },
  { kw: ['cabinet hardware', 'drawer pull', 'cabinet knob', 'hinge'], unit: 'ea', low: 5, mid: 14, high: 32 },

  // ── Electrical ──
  { kw: ['14/2 wire', '14/2 romex', '14 awg', 'nm-b 14'], unit: 'lf', low: 0.55, mid: 0.85, high: 1.30 },
  { kw: ['12/2 wire', '12/2 romex', '12 awg', 'nm-b 12'], unit: 'lf', low: 0.75, mid: 1.15, high: 1.75 },
  { kw: ['outlet', 'receptacle', 'duplex outlet', 'electrical outlet'], unit: 'ea', low: 3, mid: 6, high: 12 },
  { kw: ['gfci outlet', 'gfci receptacle', 'gfi outlet'], unit: 'ea', low: 12, mid: 22, high: 40 },
  { kw: ['switch', 'light switch', 'toggle switch'], unit: 'ea', low: 3, mid: 6, high: 14 },
  { kw: ['junction box', 'electrical box', 'gang box', 'outlet box'], unit: 'ea', low: 3, mid: 5, high: 9 },
  { kw: ['circuit breaker', 'breaker', 'double pole breaker'], unit: 'ea', low: 8, mid: 16, high: 32 },
  { kw: ['conduit', '1/2 conduit', '3/4 conduit', 'emt conduit'], unit: 'lf', low: 0.50, mid: 0.85, high: 1.30 },
  { kw: ['light fixture', 'recessed light', 'can light', 'led downlight'], unit: 'ea', low: 15, mid: 35, high: 80 },

  // ── Plumbing ──
  { kw: ['pvc pipe 4', '4 inch pvc', 'drain pipe', 'sewer pipe'], unit: 'lf', low: 2.80, mid: 4.50, high: 7 },
  { kw: ['pvc pipe 2', '2 inch pvc', 'schedule 40'], unit: 'lf', low: 1.20, mid: 2, high: 3.20 },
  { kw: ['pex pipe', 'pex tubing', 'flexible pipe', '1/2 pex', '3/4 pex'], unit: 'lf', low: 0.50, mid: 0.85, high: 1.40 },
  { kw: ['copper pipe', 'copper tubing', 'type l', 'type m copper'], unit: 'lf', low: 1.50, mid: 2.80, high: 4.50 },
  { kw: ['ball valve', 'shut-off valve', 'gate valve', 'water valve'], unit: 'ea', low: 8, mid: 18, high: 38 },
  { kw: ['fitting', 'pipe fitting', 'elbow', 'tee fitting', 'coupling'], unit: 'ea', low: 2, mid: 5, high: 10 },

  // ── HVAC ──
  { kw: ['air handler', 'air handler unit', 'ahu', 'furnace'], unit: 'ea', low: 600, mid: 1200, high: 2500 },
  { kw: ['condenser', 'ac condenser', 'outdoor unit', 'heat pump'], unit: 'ea', low: 900, mid: 1600, high: 3200 },
  { kw: ['flex duct', 'flexible duct', 'duct insulated'], unit: 'lf', low: 1.20, mid: 2.20, high: 3.50 },
  { kw: ['sheet metal duct', 'rigid duct', 'metal duct'], unit: 'lf', low: 2, mid: 3.50, high: 6 },
  { kw: ['hvac filter', 'air filter', 'furnace filter', 'merv filter'], unit: 'ea', low: 8, mid: 20, high: 50 },
  { kw: ['thermostat', 'smart thermostat', 'programmable thermostat'], unit: 'ea', low: 25, mid: 75, high: 200 },
  { kw: ['register', 'vent cover', 'grille', 'diffuser'], unit: 'ea', low: 8, mid: 18, high: 40 },

  // ── Insulation ──
  { kw: ['r-13', 'r13', 'batt insulation', 'fiberglass batt'], unit: 'sf', low: 0.40, mid: 0.65, high: 1 },
  { kw: ['r-19', 'r19', 'r-21', 'r21 batt', 'wall batt'], unit: 'sf', low: 0.55, mid: 0.85, high: 1.30 },
  { kw: ['r-30', 'r30', 'r-38', 'r38', 'attic insulation batt'], unit: 'sf', low: 0.65, mid: 1, high: 1.60 },
  { kw: ['spray foam', 'closed cell foam', 'open cell foam', 'spray insulation'], unit: 'sf', low: 1, mid: 2.20, high: 4 },
  { kw: ['rigid foam', 'xps foam', 'eps board', 'foam board'], unit: 'sf', low: 0.35, mid: 0.65, high: 1.10 },
  { kw: ['blown insulation', 'cellulose', 'blown-in', 'loose fill'], unit: 'sf', low: 0.45, mid: 0.75, high: 1.20 },

  // ── Gutters ──
  { kw: ['aluminum gutter', 'gutter 5 inch', 'gutter 6 inch', 'k-style gutter'], unit: 'lf', low: 5, mid: 8, high: 13 },
  { kw: ['downspout', 'down spout', 'leader'], unit: 'lf', low: 4, mid: 7, high: 11 },
  { kw: ['gutter guard', 'leaf guard', 'gutter screen', 'gutter filter'], unit: 'lf', low: 1.50, mid: 3.50, high: 7 },
  { kw: ['gutter hanger', 'gutter spike', 'gutter bracket'], unit: 'ea', low: 1, mid: 2, high: 3.50 },

  // ── Landscaping ──
  { kw: ['mulch', 'bark mulch', 'wood chip', 'rubber mulch'], unit: 'cy', low: 28, mid: 46, high: 70 },
  { kw: ['topsoil', 'fill dirt', 'garden soil'], unit: 'cy', low: 25, mid: 42, high: 65 },
  { kw: ['sod', 'grass sod', 'turf', 'lawn sod'], unit: 'sf', low: 0.28, mid: 0.50, high: 0.85 },
  { kw: ['grass seed', 'lawn seed', 'turf seed'], unit: 'lb', low: 4, mid: 8, high: 16 },
  { kw: ['gravel', 'stone', 'pea gravel', 'crushed stone', 'base rock'], unit: 'ton', low: 35, mid: 58, high: 95 },
  { kw: ['paver', 'concrete paver', 'patio paver', 'block paver'], unit: 'sf', low: 3, mid: 6, high: 12 },
  { kw: ['landscape edging', 'steel edging', 'plastic edging'], unit: 'lf', low: 0.60, mid: 1.20, high: 2.20 },
  { kw: ['shrub', 'bush', 'plant', 'ornamental'], unit: 'ea', low: 20, mid: 50, high: 130 },
  { kw: ['tree', 'shade tree', 'fruit tree', 'ornamental tree'], unit: 'ea', low: 55, mid: 160, high: 450 },

  // ── Sprinklers / Irrigation ──
  { kw: ['sprinkler head', 'rotor head', 'pop-up head', 'spray head'], unit: 'ea', low: 5, mid: 10, high: 20 },
  { kw: ['irrigation pipe', 'sprinkler pipe', 'poly pipe', '1 inch pipe'], unit: 'lf', low: 0.45, mid: 0.80, high: 1.30 },
  { kw: ['zone valve', 'irrigation valve', 'solenoid valve'], unit: 'ea', low: 15, mid: 30, high: 55 },
  { kw: ['irrigation controller', 'sprinkler timer', 'smart controller'], unit: 'ea', low: 50, mid: 110, high: 250 },
  { kw: ['backflow preventer', 'backflow device'], unit: 'ea', low: 30, mid: 60, high: 115 },

  // ── Pool ──
  { kw: ['pool pump', 'variable speed pump', 'swimming pool pump'], unit: 'ea', low: 350, mid: 700, high: 1400 },
  { kw: ['pool filter', 'sand filter', 'cartridge filter', 'de filter'], unit: 'ea', low: 250, mid: 520, high: 1050 },
  { kw: ['pool liner', 'vinyl liner', 'pool vinyl'], unit: 'ea', low: 800, mid: 1600, high: 3200 },
  { kw: ['pool tile', 'waterline tile', 'pool mosaic'], unit: 'sf', low: 5, mid: 12, high: 28 },
  { kw: ['pool plaster', 'pool finish', 'marcite', 'pebble tec'], unit: 'sf', low: 4, mid: 8, high: 14 },
  { kw: ['pool light', 'underwater light', 'led pool light'], unit: 'ea', low: 80, mid: 180, high: 400 },

  // ── Supplies / Hardware ──
  { kw: ['construction adhesive', 'pl premium', 'liquid nail', 'subfloor adhesive'], unit: 'tube', low: 4, mid: 8, high: 14 },
  { kw: ['wood screw', 'drywall screw', 'deck screw'], unit: 'lb', low: 4, mid: 8, high: 15 },
  { kw: ['framing nail', 'nail', 'sinker', '16d nail'], unit: 'lb', low: 3, mid: 6, high: 10 },
  { kw: ['concrete anchor', 'tapcon', 'wedge anchor', 'sleeve anchor'], unit: 'ea', low: 0.50, mid: 1.20, high: 2.50 },
  { kw: ['weatherstripping', 'door sweep', 'foam seal'], unit: 'ea', low: 8, mid: 18, high: 35 },
  { kw: ['spray paint', 'marking paint', 'marking chalk'], unit: 'ea', low: 5, mid: 8, high: 14 },
]

export const REF_LABOR: RefEntry[] = [
  { kw: ['general labor', 'laborer', 'helper', 'cleanup crew', 'demo crew'], unit: 'hr', low: 18, mid: 28, high: 42 },
  { kw: ['painter', 'painting', 'interior paint', 'exterior paint', 'spray paint'], unit: 'hr', low: 24, mid: 40, high: 62 },
  { kw: ['drywall', 'hang drywall', 'hang sheetrock', 'drywall tape', 'drywall finish'], unit: 'hr', low: 30, mid: 50, high: 75 },
  { kw: ['framing', 'framer', 'rough carpentry', 'wall framing', 'roof framing'], unit: 'hr', low: 35, mid: 58, high: 85 },
  { kw: ['finish carpentry', 'finish carpenter', 'trim work', 'millwork', 'crown molding'], unit: 'hr', low: 42, mid: 68, high: 100 },
  { kw: ['cabinet', 'cabinet install', 'cabinet set', 'kitchen cabinet'], unit: 'hr', low: 40, mid: 65, high: 95 },
  { kw: ['tile setter', 'tile install', 'tile work', 'tiling', 'set tile', 'grout tile'], unit: 'hr', low: 36, mid: 58, high: 88 },
  { kw: ['flooring', 'floor install', 'floor layer', 'hardwood install', 'vinyl install', 'carpet install'], unit: 'hr', low: 28, mid: 46, high: 70 },
  { kw: ['roofer', 'roofing', 'shingle install', 'roof repair', 'roof install'], unit: 'hr', low: 30, mid: 48, high: 72 },
  { kw: ['electrician', 'electrical work', 'wire', 'wiring', 'electrical install'], unit: 'hr', low: 58, mid: 88, high: 135 },
  { kw: ['plumber', 'plumbing', 'pipe install', 'drain', 'water line'], unit: 'hr', low: 62, mid: 98, high: 150 },
  { kw: ['hvac', 'hvac tech', 'ac install', 'duct install', 'heat pump install'], unit: 'hr', low: 62, mid: 95, high: 145 },
  { kw: ['concrete', 'pour concrete', 'concrete finish', 'concrete form'], unit: 'hr', low: 28, mid: 45, high: 68 },
  { kw: ['masonry', 'brick', 'block layer', 'stucco', 'stone work'], unit: 'hr', low: 36, mid: 60, high: 92 },
  { kw: ['landscaper', 'landscape', 'grading', 'excavate', 'dig', 'yard work'], unit: 'hr', low: 22, mid: 36, high: 56 },
  { kw: ['fence install', 'fence', 'fencing crew', 'chain link install'], unit: 'hr', low: 28, mid: 46, high: 68 },
  { kw: ['window install', 'window replacement', 'door install', 'window set'], unit: 'hr', low: 40, mid: 64, high: 96 },
  { kw: ['excavator', 'excavation', 'operator', 'equipment operator', 'grading machine'], unit: 'hr', low: 65, mid: 100, high: 155 },
  { kw: ['pool builder', 'pool crew', 'pool construction', 'pool plaster'], unit: 'hr', low: 38, mid: 62, high: 92 },
  { kw: ['sprinkler', 'irrigation install', 'irrigation tech', 'landscape irrigation'], unit: 'hr', low: 32, mid: 50, high: 76 },
  { kw: ['inspector', 'inspection', 'project manager', 'superintendent', 'foreman'], unit: 'hr', low: 48, mid: 80, high: 125 },
  { kw: ['cleanup', 'site clean', 'debris removal', 'haul away', 'clean up'], unit: 'hr', low: 18, mid: 28, high: 42 },
]

export const REF_OVERHEAD: RefEntry[] = [
  { kw: ['building permit', 'residential permit', 'construction permit'], unit: 'ea', low: 400, mid: 900, high: 2500 },
  { kw: ['electrical permit', 'electric permit'], unit: 'ea', low: 100, mid: 260, high: 700 },
  { kw: ['plumbing permit', 'plumbing fee'], unit: 'ea', low: 100, mid: 250, high: 650 },
  { kw: ['roofing permit', 'roof permit'], unit: 'ea', low: 75, mid: 200, high: 500 },
  { kw: ['mechanical permit', 'hvac permit'], unit: 'ea', low: 100, mid: 260, high: 650 },
  { kw: ['dumpster', 'roll-off', 'debris box', 'trash container', 'bin rental'], unit: 'ea', low: 280, mid: 460, high: 780, note: 'per week' },
  { kw: ['portable toilet', 'porta potty', 'restroom rental', 'port-a-john'], unit: 'ea', low: 180, mid: 310, high: 580, note: 'per month' },
  { kw: ['equipment rental', 'tool rental', 'scaffolding', 'lift rental'], unit: 'ea', low: 85, mid: 220, high: 500, note: 'per day' },
  { kw: ['excavator rental', 'backhoe rental', 'mini excavator', 'bobcat rental'], unit: 'ea', low: 380, mid: 650, high: 1300, note: 'per day' },
  { kw: ['site cleanup', 'final cleanup', 'clean-up'], unit: 'ea', low: 200, mid: 500, high: 1300 },
  { kw: ['insurance', 'project insurance', 'builder risk', 'gl insurance'], unit: 'ea', low: 400, mid: 1100, high: 3200 },
  { kw: ['bond', 'performance bond', 'payment bond', 'license bond'], unit: 'ea', low: 200, mid: 650, high: 2000 },
  { kw: ['debris', 'haul away', 'disposal', 'dump fee', 'landfill'], unit: 'ea', low: 200, mid: 420, high: 950 },
  { kw: ['storage', 'storage pod', 'storage container', 'shipping container'], unit: 'ea', low: 100, mid: 200, high: 400, note: 'per month' },
  { kw: ['testing', 'inspection fee', 'third party', 'engineering inspection'], unit: 'ea', low: 200, mid: 550, high: 1500 },
]

export const REF_SUBCONTRACTOR: RefEntry[] = [
  { kw: ['electrician', 'electrical sub', 'electrical contractor'], unit: 'day', low: 600, mid: 1050, high: 1800 },
  { kw: ['plumber', 'plumbing sub', 'plumbing contractor'], unit: 'day', low: 650, mid: 1100, high: 1900 },
  { kw: ['hvac', 'hvac contractor', 'ac contractor', 'mechanical sub'], unit: 'day', low: 600, mid: 1050, high: 1850 },
  { kw: ['concrete sub', 'concrete contractor', 'flatwork', 'foundation sub'], unit: 'day', low: 800, mid: 1400, high: 2800 },
  { kw: ['roofer', 'roofing sub', 'roofing contractor'], unit: 'day', low: 600, mid: 1100, high: 2200 },
  { kw: ['painter sub', 'painting contractor', 'painting company'], unit: 'day', low: 500, mid: 900, high: 1800 },
  { kw: ['landscaper', 'landscaping contractor', 'landscape company'], unit: 'day', low: 450, mid: 800, high: 1600 },
  { kw: ['framing sub', 'framing contractor', 'framing crew'], unit: 'day', low: 700, mid: 1300, high: 2600 },
  { kw: ['drywall sub', 'drywall contractor', 'drywall company'], unit: 'day', low: 550, mid: 950, high: 1900 },
  { kw: ['structural engineer', 'engineer', 'structural'], unit: 'ea', low: 500, mid: 1400, high: 4000, note: 'per project' },
  { kw: ['surveyor', 'survey', 'land survey'], unit: 'ea', low: 400, mid: 950, high: 2500, note: 'per project' },
  { kw: ['pool contractor', 'pool company', 'pool builder'], unit: 'day', low: 1000, mid: 2000, high: 4000 },
  { kw: ['tile contractor', 'tile sub', 'tile company'], unit: 'day', low: 500, mid: 900, high: 1700 },
  { kw: ['flooring sub', 'flooring contractor', 'flooring company'], unit: 'day', low: 450, mid: 800, high: 1600 },
  { kw: ['window company', 'window installer', 'door contractor'], unit: 'day', low: 500, mid: 900, high: 1700 },
]

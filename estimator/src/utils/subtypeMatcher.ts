// Keyword-to-subtype-id lookup maps per project type
const SUBTYPE_KEYWORDS: Record<string, Array<{ id: string; keywords: string[] }>> = {
  remodeling: [
    { id: 'bathroom-remodel', keywords: ['bathroom', 'bath', 'shower', 'tub', 'toilet', 'vanity', 'restroom'] },
    { id: 'kitchen-remodel', keywords: ['kitchen', 'cook', 'cabinet', 'countertop', 'island', 'appliance'] },
    { id: 'basement-finish', keywords: ['basement', 'lower level', 'cellar', 'underground', 'subgrade'] },
    { id: 'room-addition', keywords: ['addition', 'add room', 'extend', 'extension', 'bump out', 'new room'] },
    { id: 'garage-conversion', keywords: ['garage', 'adu', 'accessory', 'granny flat', 'in-law', 'conversion'] },
    { id: 'laundry-room', keywords: ['laundry', 'washer', 'dryer', 'utility room', 'mud room'] },
    { id: 'home-office', keywords: ['office', 'study', 'den', 'workspace', 'work from home'] },
    { id: 'sunroom', keywords: ['sunroom', 'porch', 'sun room', '3-season', 'enclosed porch', 'screened porch'] },
  ],
  paint: [
    { id: 'interior-paint', keywords: ['interior', 'inside', 'walls', 'ceiling', 'rooms', 'living room', 'bedroom'] },
    { id: 'exterior-paint', keywords: ['exterior', 'outside', 'siding', 'facade', 'outside walls', 'house exterior'] },
    { id: 'cabinet-paint', keywords: ['cabinet', 'refinish', 'cabinet paint', 'kitchen cabinet'] },
    { id: 'deck-fence-paint', keywords: ['deck', 'fence', 'stain', 'outbuilding', 'shed', 'porch stain'] },
    { id: 'new-construction-paint', keywords: ['new construction', 'new build', 'builder', 'newly built'] },
    { id: 'brick-masonry-paint', keywords: ['brick', 'masonry', 'concrete block', 'stucco', 'stone paint'] },
    { id: 'garage-interior-paint', keywords: ['garage interior', 'garage walls', 'shop paint'] },
  ],
  cabinets: [
    { id: 'kitchen-cabinets', keywords: ['kitchen', 'kitchen cabinet', 'new cabinet', 'install cabinet'] },
    { id: 'cabinet-refinish', keywords: ['refinish', 'repaint', 'reface', 'sand and stain cabinet'] },
    { id: 'bathroom-vanity-install', keywords: ['vanity', 'bathroom cabinet', 'bath cabinet'] },
    { id: 'laundry-cabinets', keywords: ['laundry', 'utility cabinet', 'mudroom cabinet', 'storage cabinet'] },
    { id: 'closet-organizer', keywords: ['closet', 'organizer', 'wardrobe', 'walk-in closet'] },
    { id: 'built-in-shelving', keywords: ['built-in', 'bookcase', 'shelving', 'bookshelves', 'shelf'] },
    { id: 'pantry-install', keywords: ['pantry', 'pantry cabinet', 'food storage'] },
  ],
  fencing: [
    { id: 'wood-privacy', keywords: ['wood privacy', 'privacy fence', 'solid fence', '6 foot fence'] },
    { id: 'wood-picket', keywords: ['picket', 'wood picket', 'white fence', 'decorative fence'] },
    { id: 'wood-split-rail', keywords: ['split rail', 'rail fence', 'rustic fence', 'post and rail'] },
    { id: 'aluminum-steel-fence', keywords: ['aluminum', 'steel fence', 'metal fence', 'ornamental'] },
    { id: 'wrought-iron-fence', keywords: ['wrought iron', 'iron fence', 'wrought iron'] },
    { id: 'vinyl-fence', keywords: ['vinyl', 'pvc', 'plastic fence', 'white vinyl'] },
    { id: 'chain-link', keywords: ['chain link', 'chain-link', 'chainlink', 'wire fence', 'cyclone'] },
  ],
  pool: [
    { id: 'pool-opening', keywords: ['open', 'opening', 'spring opening', 'open pool', 'start pool'] },
    { id: 'pool-closing', keywords: ['close', 'closing', 'winterize', 'winterization', 'shut down pool'] },
    { id: 'pool-maintenance', keywords: ['maintenance', 'weekly', 'monthly', 'service', 'clean pool', 'chemicals'] },
    { id: 'pool-repair', keywords: ['repair', 'pump', 'filter', 'heater', 'equipment', 'broken', 'fix pool'] },
    { id: 'pool-resurfacing', keywords: ['resurface', 'plaster', 'replaster', 'pebble', 'gunite', 'refinish pool'] },
    { id: 'safety-cover', keywords: ['cover', 'safety cover', 'winter cover', 'pool cover', 'tarp'] },
  ],
  landscaping: [
    { id: 'lawn-install', keywords: ['sod', 'lawn install', 'new lawn', 'turf', 'grass install', 'seed and sod'] },
    { id: 'landscape-design', keywords: ['landscape design', 'full landscape', 'plants trees shrubs', 'landscaping'] },
    { id: 'lawn-mowing-weekly', keywords: ['weekly mow', 'mow weekly', 'weekly service', 'weekly cut'] },
    { id: 'lawn-mowing-biweekly', keywords: ['biweekly', 'bi-weekly', 'every two weeks', 'twice a month', 'every other week'] },
    { id: 'lawn-mowing-monthly', keywords: ['monthly mow', 'mow monthly', 'once a month', 'monthly cut'] },
    { id: 'lawn-mowing-onetime', keywords: ['one time', 'onetime', 'single cut', 'one-time mow', 'one cut'] },
    { id: 'mulch-flowerbeds', keywords: ['mulch', 'flower bed', 'garden bed', 'bed service', 'flowerbed'] },
    { id: 'leaf-cleanup', keywords: ['leaves', 'leaf removal', 'fall cleanup', 'leaf cleanup', 'rake'] },
    { id: 'aeration-overseeding', keywords: ['aeration', 'aerate', 'overseed', 'overseeding', 'core aerate'] },
    { id: 'weed-control', keywords: ['weed', 'fertilize', 'herbicide', 'fertilization', 'weed control'] },
    { id: 'tree-trimming', keywords: ['tree trim', 'trim tree', 'prune', 'shrub trim', 'hedge', 'tree service'] },
  ],
  tile: [
    { id: 'tile-floor-indoor', keywords: ['floor tile', 'indoor floor', 'kitchen floor', 'bathroom floor tile'] },
    { id: 'tile-floor-outdoor', keywords: ['outdoor tile', 'patio tile', 'pool deck tile', 'exterior tile'] },
    { id: 'shower-wet-area', keywords: ['shower', 'tub surround', 'wet area', 'shower tile', 'bathroom tile'] },
    { id: 'wall-backsplash', keywords: ['backsplash', 'wall tile', 'accent wall', 'kitchen backsplash'] },
    { id: 'custom-pattern-floor', keywords: ['pattern', 'medallion', 'herringbone', 'custom tile', 'mosaic floor'] },
  ],
  concrete: [
    { id: 'epoxy-garage', keywords: ['epoxy', 'garage floor', 'polyurea', 'floor coating', 'garage coating'] },
    { id: 'concrete-driveway', keywords: ['driveway', 'concrete driveway', 'pour driveway'] },
    { id: 'concrete-patio', keywords: ['patio slab', 'concrete patio', 'slab', 'pour patio'] },
    { id: 'sidewalk-walkway', keywords: ['sidewalk', 'walkway', 'path', 'steps', 'stoop', 'walk'] },
    { id: 'stamped-decorative', keywords: ['stamped', 'decorative concrete', 'colored concrete', 'stained concrete'] },
    { id: 'concrete-repair', keywords: ['repair', 'crack', 'level', 'mudjack', 'raise', 'fix concrete'] },
    { id: 'retaining-wall', keywords: ['retaining wall', 'block wall', 'retain wall', 'grade wall'] },
  ],
  'house-cleaning': [
    { id: 'standard-cleaning', keywords: ['standard', 'regular cleaning', 'routine', 'basic clean'] },
    { id: 'deep-cleaning', keywords: ['deep clean', 'deep cleaning', 'thorough', 'detailed clean'] },
    { id: 'move-out-cleaning', keywords: ['move out', 'move in', 'move-out', 'vacant', 'empty house'] },
    { id: 'post-construction', keywords: ['post construction', 'construction cleanup', 'builder cleanup', 'new build clean'] },
    { id: 'recurring-weekly', keywords: ['weekly cleaning', 'every week', 'weekly service', 'weekly housekeeper'] },
    { id: 'recurring-biweekly', keywords: ['biweekly cleaning', 'bi-weekly', 'every two weeks', 'twice monthly'] },
  ],
  'framing-drywall': [
    { id: 'new-walls', keywords: ['new wall', 'frame wall', 'framing', 'partition wall', 'add wall'] },
    { id: 'drywall-repair', keywords: ['repair', 'patch', 'hole', 'drywall patch', 'fix drywall'] },
    { id: 'basement-framing', keywords: ['basement', 'basement frame', 'finish basement', 'lower level frame'] },
    { id: 'drywall-texture', keywords: ['texture', 'skim coat', 'knockdown', 'orange peel', 'popcorn remove'] },
    { id: 'soundproof-wall', keywords: ['soundproof', 'sound proof', 'acoustic', 'quiet wall', 'noise reduction'] },
  ],
  'outdoor-patio': [
    { id: 'paver-patio', keywords: ['paver', 'pavers', 'paver patio', 'brick patio', 'stone patio'] },
    { id: 'composite-deck', keywords: ['composite', 'trex', 'deck composite', 'decking'] },
    { id: 'wood-deck', keywords: ['wood deck', 'pressure treated', 'PT deck', 'cedar deck', 'pine deck'] },
    { id: 'pergola-shade', keywords: ['pergola', 'shade structure', 'arbor', 'gazebo', 'canopy'] },
    { id: 'fire-pit', keywords: ['fire pit', 'firepit', 'fire feature', 'outdoor fire'] },
    { id: 'outdoor-kitchen', keywords: ['outdoor kitchen', 'bbq', 'grill station', 'outdoor cooking', 'kitchen island'] },
  ],
  windows: [
    { id: 'window-replacement', keywords: ['replace window', 'window replacement', 'new window', 'window swap'] },
    { id: 'window-new-opening', keywords: ['new opening', 'cut opening', 'add window', 'new window opening'] },
    { id: 'skylight', keywords: ['skylight', 'sky light', 'velux', 'roof window', 'tubular skylight'] },
    { id: 'door-replacement', keywords: ['door', 'entry door', 'exterior door', 'front door', 'door replace'] },
    { id: 'sliding-glass-door', keywords: ['sliding door', 'glass door', 'french door', 'patio door', 'slider'] },
  ],
  flooring: [
    { id: 'lvp-laminate', keywords: ['lvp', 'laminate', 'vinyl plank', 'luxury vinyl', 'click floor'] },
    { id: 'hardwood', keywords: ['hardwood', 'wood floor', 'oak floor', 'solid wood', 'engineered wood'] },
    { id: 'tile-flooring', keywords: ['tile', 'ceramic', 'porcelain', 'floor tile'] },
    { id: 'carpet', keywords: ['carpet', 'carpeting', 'rug', 'plush', 'berber'] },
    { id: 'hardwood-refinish', keywords: ['refinish', 'sand floor', 'restain', 'buff', 'floor refinish'] },
    { id: 'subfloor-repair', keywords: ['subfloor', 'sub-floor', 'squeak', 'floor repair', 'underlayment'] },
  ],
  sprinklers: [
    { id: 'sprinkler-new', keywords: ['new sprinkler', 'install sprinkler', 'irrigation system', 'new system'] },
    { id: 'sprinkler-repair', keywords: ['repair sprinkler', 'fix irrigation', 'broken head', 'leaking line'] },
    { id: 'drip-irrigation', keywords: ['drip', 'drip irrigation', 'drip system', 'micro irrigation'] },
    { id: 'smart-controller', keywords: ['smart controller', 'wifi', 'rachio', 'hunter', 'app control', 'smart irrigation'] },
    { id: 'sprinkler-expansion', keywords: ['expand', 'add zone', 'new zone', 'more heads', 'additional heads'] },
  ],
  roofing: [
    { id: 'shingle-replace', keywords: ['shingle', 'asphalt', 'architectural shingle', 'roof replace', 'new roof'] },
    { id: 'metal-roof', keywords: ['metal', 'steel roof', 'standing seam', 'metal panel', 'metal roofing'] },
    { id: 'flat-roof-tpo', keywords: ['flat', 'tpo', 'epdm', 'flat roof', 'low slope', 'rubber roof', 'membrane'] },
    { id: 'tile-roof', keywords: ['tile', 'clay tile', 'concrete tile', 'spanish tile', 'barrel tile'] },
    { id: 'roof-repair', keywords: ['repair', 'leak', 'fix roof', 'patch', 'missing shingles', 'roof leak'] },
    { id: 'soffit-fascia', keywords: ['soffit', 'fascia', 'soffit fascia', 'eave board', 'trim board'] },
  ],
  electrical: [
    { id: 'panel-upgrade', keywords: ['panel', 'breaker box', 'service upgrade', '200 amp', 'electrical panel'] },
    { id: 'outlet-switch-install', keywords: ['outlet', 'switch', 'receptacle', 'gfci', 'plug', 'dimmer'] },
    { id: 'light-fixture-install', keywords: ['light', 'fixture', 'recessed', 'can light', 'chandelier', 'lighting'] },
    { id: 'ceiling-fan-install', keywords: ['ceiling fan', 'fan', 'fan install', 'paddle fan'] },
    { id: 'ev-charger', keywords: ['ev', 'electric vehicle', 'charger', 'level 2', 'tesla', 'car charger'] },
    { id: 'whole-home-generator', keywords: ['generator', 'whole home', 'standby', 'generac', 'backup power'] },
    { id: 'dedicated-circuit', keywords: ['dedicated circuit', 'appliance circuit', 'hot tub wiring', 'dryer circuit', 'range circuit'] },
  ],
  plumbing: [
    { id: 'water-heater', keywords: ['water heater', 'hot water', 'tank', 'heater replace'] },
    { id: 'bathroom-plumbing', keywords: ['bathroom plumbing', 'rough in', 'bath rough', 'new bathroom pipe'] },
    { id: 'kitchen-plumbing', keywords: ['kitchen sink', 'faucet', 'kitchen plumbing', 'sink replace'] },
    { id: 'toilet-replacement', keywords: ['toilet', 'commode', 'wc', 'replace toilet', 'new toilet'] },
    { id: 'water-softener', keywords: ['water softener', 'softener', 'filtration', 'water filter', 'reverse osmosis'] },
    { id: 'whole-house-repipe', keywords: ['repipe', 'whole house', 'repiping', 'copper pipe', 'pex repipe'] },
    { id: 'sewer-drain-repair', keywords: ['sewer', 'drain', 'clog', 'sewer line', 'drain repair', 'rooter'] },
    { id: 'outdoor-spigot', keywords: ['spigot', 'hose bib', 'outdoor faucet', 'exterior faucet', 'freeze proof'] },
  ],
  hvac: [
    { id: 'ac-replace', keywords: ['ac', 'air condition', 'condenser', 'central air', 'ac replace', 'cooling'] },
    { id: 'furnace-replace', keywords: ['furnace', 'heat', 'gas heat', 'heating', 'boiler', 'forced air'] },
    { id: 'mini-split-install', keywords: ['mini split', 'minisplit', 'ductless', 'heat pump', 'mitsubishi', 'split system'] },
    { id: 'duct-cleaning', keywords: ['duct', 'ductwork', 'duct cleaning', 'air duct', 'hvac cleaning', 'vents'] },
    { id: 'smart-thermostat-install', keywords: ['thermostat', 'nest', 'ecobee', 'smart thermostat', 'wifi thermostat'] },
    { id: 'whole-house-humidifier', keywords: ['humidifier', 'humidity', 'whole house humid', 'aprilaire'] },
    { id: 'hvac-maintenance', keywords: ['tune up', 'maintenance', 'service hvac', 'seasonal service', 'hvac service'] },
  ],
  insulation: [
    { id: 'attic-insulation', keywords: ['attic', 'blown in', 'blow insulation', 'attic insulation', 'cellulose'] },
    { id: 'spray-foam', keywords: ['spray foam', 'foam', 'closed cell', 'open cell', 'spray insulation'] },
    { id: 'crawlspace-insulation', keywords: ['crawl space', 'crawlspace', 'under floor', 'crawl insulation'] },
    { id: 'wall-insulation', keywords: ['wall insulation', 'batt', 'fiberglass batt', 'blown wall', 'cavity insulation'] },
    { id: 'radiant-barrier', keywords: ['radiant barrier', 'foil', 'heat barrier', 'reflective insulation'] },
  ],
  gutters: [
    { id: 'gutter-install', keywords: ['install gutter', 'new gutter', 'gutter replacement', 'replace gutter'] },
    { id: 'gutter-repair', keywords: ['repair gutter', 'fix gutter', 'leaking gutter', 'sagging gutter', 'reattach'] },
    { id: 'gutter-guards', keywords: ['gutter guard', 'leaf guard', 'leaf filter', 'gutter cover', 'protection'] },
    { id: 'downspout-drainage', keywords: ['downspout', 'french drain', 'drainage', 'yard drain', 'extend downspout'] },
  ],
}

export function findBestSubType(projectTypeId: string, text: string): { id: string; score: number } | null {
  const candidates = SUBTYPE_KEYWORDS[projectTypeId]
  if (!candidates || !text.trim()) return null
  const lower = text.toLowerCase()
  let best: { id: string; score: number } | null = null
  for (const c of candidates) {
    let score = 0
    for (const kw of c.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length // longer phrase match = higher score
    }
    if (score > 0 && (!best || score > best.score)) best = { id: c.id, score }
  }
  return best
}

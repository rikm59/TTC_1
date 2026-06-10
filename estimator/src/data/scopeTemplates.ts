export interface ScopeTemplate {
  label: string
  labelEs: string
  text: string
  textEs: string
}

const scopeTemplates: Record<string, ScopeTemplate[]> = {
  paint: [
    {
      label: 'Interior Full Room',
      labelEs: 'Cuarto Interior Completo',
      text: `• Protect floors and furniture with drop cloths\n• Clean and sand all surfaces\n• Fill holes, cracks, and imperfections with spackle; sand smooth\n• Apply 1 coat primer to all walls and ceiling\n• Apply 2 finish coats of contractor-grade paint (color TBD)\n• Paint all trim, baseboards, and door frames\n• Remove all masking and protection\n• Final touch-ups and walkthrough with homeowner`,
      textEs: `• Proteger pisos y muebles con telas protectoras\n• Limpiar y lijar todas las superficies\n• Rellenar huecos, grietas e imperfecciones; lijar\n• Aplicar 1 mano de imprimante en paredes y techo\n• Aplicar 2 manos de pintura de acabado (color a definir)\n• Pintar molduras, zócalos y marcos de puertas\n• Retirar todo el enmascarado y protección\n• Retoques finales y recorrido con el propietario`,
    },
    {
      label: 'Exterior Full House',
      labelEs: 'Exterior Casa Completa',
      text: `• Power wash all exterior surfaces\n• Scrape and remove loose or peeling paint\n• Caulk gaps around windows, doors, and trim\n• Spot-prime bare wood and stained areas\n• Apply 2 coats of exterior-grade paint (color TBD) to all siding\n• Paint all fascia, soffits, and trim\n• Clean up and remove all debris from property`,
      textEs: `• Lavar con presión todas las superficies exteriores\n• Raspar y quitar pintura suelta o descascarada\n• Sellar grietas alrededor de ventanas, puertas y molduras\n• Aplicar imprimante en madera expuesta y manchas\n• Aplicar 2 manos de pintura exterior (color a definir)\n• Pintar fascias, aleros y molduras\n• Limpiar y retirar todos los desechos de la propiedad`,
    },
  ],
  fencing: [
    {
      label: 'Wood Privacy Fence',
      labelEs: 'Cerca de Madera Privada',
      text: `• Mark fence line and remove existing fence/debris\n• Set posts in concrete at 8-ft intervals to 24" depth\n• Allow concrete to cure before attaching rails\n• Install 2 horizontal rails per section\n• Attach vertical fence boards, 6" overlap each side\n• Install gate(s) with hardware per plan\n• Apply wood preservative/stain (color TBD)\n• Clean up and haul away all debris`,
      textEs: `• Marcar línea de cerca y retirar cerca/escombros existentes\n• Fijar postes en concreto cada 2.4 m a 60 cm de profundidad\n• Esperar fraguado antes de colocar rieles\n• Instalar 2 rieles horizontales por sección\n• Fijar tablas verticales con 15 cm de superposición\n• Instalar puerta(s) con herrajes según plano\n• Aplicar preservante/tinte de madera (color a definir)\n• Limpiar y retirar todos los escombros`,
    },
    {
      label: 'Chain Link Fence',
      labelEs: 'Cerca de Eslabones de Cadena',
      text: `• Layout and excavate post holes at designated spacing\n• Set terminal and line posts in concrete\n• Stretch and attach chain link fabric\n• Install top rail and tension bars\n• Attach fence ties and caps\n• Install gate(s) with hinges and latch hardware\n• Clean up all excavated material and debris`,
      textEs: `• Trazar y excavar hoyos de postes en espaciados designados\n• Fijar postes terminales y de línea en concreto\n• Estirar y fijar malla de eslabones\n• Instalar riel superior y barras de tensión\n• Colocar amarres y tapas de postes\n• Instalar puerta(s) con bisagras y pestillos\n• Limpiar material excavado y escombros`,
    },
  ],
  remodeling: [
    {
      label: 'Kitchen Remodel',
      labelEs: 'Remodelación de Cocina',
      text: `• Demolish and remove existing cabinets, countertops, and fixtures\n• Install new framing or blocking as required\n• Install new base and upper cabinets per layout plan\n• Install countertops and backsplash per selected materials\n• Install new sink and reconnect plumbing supply/drain\n• Install new appliances (by others unless noted)\n• Paint walls 2 coats (color TBD)\n• Final cleanup and walkthrough`,
      textEs: `• Demoler y retirar gabinetes, encimeras y accesorios existentes\n• Instalar nuevo enmarcado o bloques según se requiera\n• Instalar nuevos gabinetes bajos y altos según plano\n• Instalar encimeras y salpicadero según materiales seleccionados\n• Instalar nuevo fregadero y reconectar plomería\n• Instalar nuevos electrodomésticos (por otros si no se indica)\n• Pintar paredes 2 manos (color a definir)\n• Limpieza final y recorrido`,
    },
    {
      label: 'Bathroom Remodel',
      labelEs: 'Remodelación de Baño',
      text: `• Demo existing tile, fixtures, and vanity\n• Install cement board substrate on shower/tub walls\n• Install new tile — floor and shower walls\n• Grout and seal all tile work\n• Install new vanity, sink, and faucet\n• Install new toilet and wax ring\n• Install new shower/tub fixture set\n• Paint walls 2 coats (color TBD)\n• Install mirrors and accessories\n• Final inspection walkthrough`,
      textEs: `• Demoler azulejos, accesorios y tocador existentes\n• Instalar tablero cementicio en paredes de ducha/tina\n• Instalar nuevos azulejos en piso y paredes de ducha\n• Lechear y sellar todo el trabajo de azulejos\n• Instalar nuevo tocador, lavabo y llave\n• Instalar nuevo inodoro y anillo de cera\n• Instalar nuevo juego de ducha/tina\n• Pintar paredes 2 manos (color a definir)\n• Instalar espejos y accesorios\n• Recorrido de inspección final`,
    },
  ],
  flooring: [
    {
      label: 'Hardwood / LVP Installation',
      labelEs: 'Instalación de Madera/LVP',
      text: `• Remove and dispose of existing flooring\n• Inspect and flatten subfloor; repair squeaks and soft spots\n• Install moisture barrier/underlayment\n• Install flooring per manufacturer specs with proper expansion gaps\n• Install transitions at doorways and room connections\n• Install baseboards and quarter-round molding\n• Final clean and wipe-down of all installed flooring`,
      textEs: `• Retirar y desechar piso existente\n• Inspeccionar y nivelar subpiso; reparar crujidos y puntos débiles\n• Instalar barrera de humedad/capa base\n• Instalar piso según especificaciones del fabricante con holguras de expansión\n• Instalar transiciones en puertas y conexiones entre cuartos\n• Instalar zócalos y moldura de cuarto de círculo\n• Limpieza final de todo el piso instalado`,
    },
    {
      label: 'Tile Installation',
      labelEs: 'Instalación de Azulejos',
      text: `• Remove existing flooring and prep subfloor\n• Install cement board or self-leveling compound as needed\n• Lay out tile pattern and dry-set before mortaring\n• Set tile in thinset mortar with proper spacing\n• Apply grout and seal upon cure\n• Install thresholds and trim pieces\n• Final clean and grout sealing`,
      textEs: `• Retirar piso existente y preparar subpiso\n• Instalar tablero cementicio o compuesto autonivelante según necesidad\n• Trazar patrón de azulejos y colocar en seco antes de mortero\n• Fijar azulejos con mortero y espaciado adecuado\n• Aplicar lechada y sellar al curar\n• Instalar umbrales y molduras\n• Limpieza final y sellado de lechada`,
    },
  ],
  roofing: [
    {
      label: 'Full Roof Replacement',
      labelEs: 'Reemplazo Total de Techo',
      text: `• Remove and dispose of existing shingles and underlayment\n• Inspect and replace damaged decking boards\n• Install new synthetic underlayment / ice & water shield at eaves\n• Install new drip edge flashing\n• Install new architectural shingles per manufacturer specs\n• Re-flash all penetrations (vents, pipes, chimneys)\n• Install new ridge cap and ventilation\n• Clean up all debris and perform magnetic nail sweep`,
      textEs: `• Retirar y desechar tejas y membrana existentes\n• Inspeccionar y reemplazar tablones de cubierta dañados\n• Instalar nueva membrana sintética / protección de hielo y agua en aleros\n• Instalar nueva moldura de gotera\n• Instalar nuevas tejas arquitectónicas según especificaciones\n• Reflasear todas las penetraciones (ventilaciones, tuberías, chimeneas)\n• Instalar nueva cumbrera y ventilación\n• Limpiar escombros y pasar imán para clavos`,
    },
  ],
  concrete: [
    {
      label: 'Driveway / Slab',
      labelEs: 'Entrada / Losa de Concreto',
      text: `• Excavate to required depth and grade\n• Compact base and add road base/gravel as needed\n• Set forms to proper grade and dimensions\n• Install rebar or wire mesh reinforcement\n• Pour and screed concrete (mix per spec)\n• Finish surface (broom, smooth, or stamped as specified)\n• Apply curing compound\n• Cut control joints at specified intervals\n• Clean up and remove all forms and debris`,
      textEs: `• Excavar a la profundidad y nivelación requerida\n• Compactar la base y agregar grava según necesidad\n• Colocar formaletas al nivel y dimensiones correctas\n• Instalar varillas de refuerzo o malla de alambre\n• Verter y enrasar concreto (mezcla según especificación)\n• Acabado de superficie (escoba, liso o estampado según especificación)\n• Aplicar compuesto de curado\n• Cortar juntas de control a intervalos especificados\n• Limpiar y retirar formaletas y escombros`,
    },
  ],
  landscaping: [
    {
      label: 'Full Landscape Package',
      labelEs: 'Paquete Completo de Jardinería',
      text: `• Clear and remove existing vegetation per plan\n• Grade and level ground as needed\n• Install edging/borders per design\n• Spread topsoil and amendment to planting beds\n• Plant trees, shrubs, and groundcover per landscape plan\n• Install lawn sod or seed\n• Install drip irrigation to planting beds\n• Apply 3" mulch to all planted areas\n• Final cleanup and owner walkthrough`,
      textEs: `• Limpiar y retirar vegetación existente según plano\n• Nivelar y graduar el terreno según necesidad\n• Instalar bordes según diseño\n• Extender tierra vegetal y enmienda en camas de siembra\n• Plantar árboles, arbustos y coberturas según plan paisajístico\n• Instalar pasto o sembrar\n• Instalar riego por goteo en camas de siembra\n• Aplicar 7.5 cm de mantillo en todas las áreas plantadas\n• Limpieza final y recorrido con el propietario`,
    },
  ],
  electrical: [
    {
      label: 'Panel Upgrade',
      labelEs: 'Actualización de Tablero',
      text: `• Pull required permits\n• Disconnect and remove existing panel\n• Install new [X]-amp main breaker panel\n• Transfer all existing circuits to new panel\n• Install required AFCI/GFCI breakers per code\n• Bond and ground panel per NEC requirements\n• Coordinate with utility for meter pull/reconnect\n• Final inspection and panel schedule labeling`,
      textEs: `• Obtener permisos requeridos\n• Desconectar y retirar tablero existente\n• Instalar nuevo tablero principal de [X] amperios\n• Transferir todos los circuitos existentes al nuevo tablero\n• Instalar breakers AFCI/GFCI requeridos por código\n• Enlazar y poner a tierra el tablero según NEC\n• Coordinar con la compañía eléctrica para medidor\n• Inspección final y etiquetado del tablero`,
    },
  ],
  plumbing: [
    {
      label: 'Water Heater Replacement',
      labelEs: 'Reemplazo de Calentador de Agua',
      text: `• Shut off water supply and drain existing unit\n• Disconnect gas/electric and water supply/discharge connections\n• Remove and haul away existing water heater\n• Install new [X]-gallon [gas/electric] water heater\n• Connect supply and discharge lines\n• Install new T&P relief valve and drain line per code\n• Reconnect gas/electric service\n• Test for leaks and proper operation\n• Set thermostat to 120°F`,
      textEs: `• Cerrar suministro de agua y vaciar unidad existente\n• Desconectar conexiones de gas/eléctrico y agua\n• Retirar y llevar calentador de agua existente\n• Instalar nuevo calentador de agua de [X] galones [gas/eléctrico]\n• Conectar líneas de suministro y descarga\n• Instalar nueva válvula T&P y línea de drenaje según código\n• Reconectar servicio de gas/eléctrico\n• Probar fugas y operación correcta\n• Ajustar termostato a 49°C (120°F)`,
    },
  ],
  hvac: [
    {
      label: 'HVAC System Replacement',
      labelEs: 'Reemplazo de Sistema HVAC',
      text: `• Recover and properly dispose of existing refrigerant\n• Remove existing indoor and outdoor units\n• Install new [X]-ton [SEER rating] outdoor condenser\n• Install new air handler/furnace\n• Install new refrigerant line set and connections\n• Install new disconnect and reconnect electrical\n• Connect to existing ductwork and thermostat wiring\n• Commission system: charge refrigerant, test all modes\n• Register warranty with manufacturer`,
      textEs: `• Recuperar y desechar correctamente el refrigerante existente\n• Retirar unidades interior y exterior existentes\n• Instalar nuevo condensador exterior de [X] toneladas [SEER]\n• Instalar nuevo manejador de aire/calefacción\n• Instalar nuevas líneas de refrigerante y conexiones\n• Instalar desconectador y reconectar eléctrico\n• Conectar a ductos y cableado de termostato existentes\n• Poner en servicio: cargar refrigerante, probar todos los modos\n• Registrar garantía con el fabricante`,
    },
  ],
}

export default scopeTemplates

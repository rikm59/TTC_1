# Pool Cleaning & Repair Quoting Guide (2026)

> Reference document for the TTC Estimator pool cleaning & maintenance project type.
> Source: industry pricing data from HomeGuide, Baker Pool Service, Bluewater Pool Services, Pool Founder.

---

## How to Quote a New Pool Customer

### 1 – Gather Pool Details (Site Visit or Photos)

| Factor | Why It Matters |
|--------|---------------|
| **Pool size / volume** (length × width × avg depth, or gallons) | Drives chemical consumption and service time |
| **Pool type** (inground / above-ground; chlorine / saltwater) | Saltwater pools require cell cleaning & replacement every 3–5 years ($600–$1,200 + labour) |
| **Cover type** (none / mesh safety / solid) | Opening cost varies: $385 no cover, $430 mesh, $585 solid cover with pump off |
| **Water features & attached spas** | Each water feature adds ~$65 to closing; spa closing costs $125–$205 |
| **Equipment & condition** (pump type, filter type, heater, lights, automation) | Identifies repair/replacement recommendations |
| **Debris load & environment** | Heavy leaf drop → weekly instead of bi-weekly service |
| **Bather load** (low / medium / high) | Higher load = more sanitizer, more frequent adjustments |
| **Access & travel time** | Affects labour and overhead allocation |

---

### 2 – Define Services to Include

#### Routine Maintenance Tasks
- **Water-chemistry testing & balancing** — free chlorine, pH, alkalinity, calcium hardness, cyanuric acid, TDS
- **Skimming & debris removal** — surface + immediate deck area
- **Brushing & vacuuming** — walls, steps, tile line, floor ($85/hr per HomeGuide; $50/week for manual vacuum per Baker)
- **Basket & filter maintenance** — empty skimmer/pump baskets, backwash or clean filters
- **Equipment inspection** — pumps, heaters, lights, chlorinators, valves; minor adjustments included
- **Water-level monitoring**

#### Add-On Services (price separately)

| Add-on | Typical Price |
|--------|--------------|
| Salt pool maintenance | +$10/week (Baker) |
| Spa maintenance | +$25/week (Baker) |
| Vanishing-edge/basin feature | +$20/week (Baker) |
| Manual vacuum | +$50/week (Baker) |
| Twice-weekly service (high bather load) | +$38/week (Baker) |
| Water-feature winterization | +$65/feature |
| Portable spa closing | +$125 |
| Inground spa closing | +$205 |
| Leaf removal before covering | $65/half-hour |

---

### 3 – Labour & Material Cost Estimates

#### Labour Rates
| Worker Type | Typical Loaded Rate |
|-------------|-------------------|
| Routine service technician | $25–$50/hr (residential) |
| Routine service technician | $35–$75/hr (commercial) |
| Licensed repair technician | $85–$120+/hr |

- Residential visits: **15–30 min**
- Commercial visits: **45–90 min**

Baker Pool Service seasonal opening rates (2025):
- Late Feb – late Mar: **$135/hr**
- Mar 31 – Apr 25: **$185/hr**
- Apr 28 – May 30: **$230/hr**
- Jun 2 – Dec 29: **$155/hr**
- Typical opening: **4 hours** (2-hour minimum)

#### Monthly Chemical Costs
- Routine chemicals: **$20–$50/month** during swimming season
- Pool startup kit (opening): **$23–$94** (shock, algaecide, clarifier, stain inhibitor)
- Winter chemical kit: **$21–$61**

---

### 4 – Overhead & Profit

- **Overhead**: allocate **20–30%** of direct costs (vehicle, fuel, insurance, licensing, admin)
- **Net profit margin**: pool service industry averages ~**18%**; aim for **20–30%** on commercial accounts

---

### 5 – Cost-Plus Formula

```
Monthly Price = (Direct Cost per Visit × Number of Visits) × (1 + Overhead %) × (1 + Profit Margin %)
```

**Example residential visit range:** $27–$55 direct cost  
**Example commercial visit range:** $68–$150 direct cost  

---

## Seasonal Service Costs

### Pool Opening
| Cost Item | Range |
|-----------|-------|
| Opening labour (standard) | $385–$585 total (HomeGuide) |
| Clean & store cover | $185 first cover, $85 each additional |
| Drain & clean entire pool | ~$1,750 (includes startup chemicals & drain cover) |
| Startup chemicals | $23–$94 depending on pool size |

### Pool Closing / Winterization
| Cost Item | Range |
|-----------|-------|
| Standard winterization | ~$480 (Baker) |
| Seasonal closing range | $365–$650 (HomeGuide) |
| Winter chemical kit | $21–$61 |
| Water-feature closing | +$65/feature |
| Leaf removal before covering | $65/half-hour |

---

## Regular Maintenance Plans

| Service | Typical Price |
|---------|--------------|
| Weekly pool maintenance (chemicals extra) | $72/week (Baker) |
| Residential monthly (chemicals included) | $80–$150/month national avg |
| Per-visit (without chemicals) | $42–$146 |
| Monthly flat rate (with chemicals) | $136–$294 national avg |
| First-time / one-time cleaning | $200–$400 |
| Commercial per-visit | $60–$90+ |

---

## Equipment Repair & Replacement Cost Reference

| Component | Repair Cost | Replacement Cost | Notes |
|-----------|-------------|-----------------|-------|
| **Pump** | $250–$800 | $1,500–$2,500 installed (VS pump) | VS saves 50–90% energy vs single-speed |
| **Gas heater** | $400–$1,200 | — | |
| **Electric heat pump** | $300–$800 | — | |
| **Heat exchanger** | — | $2,800–$4,500 | |
| **Sand filter** | $150–$400 | $300–$600 (media) | Replace sand every 5–7 years |
| **Cartridge filter** | $100–$200 | $300–$600 (set of 4) | Replace every 2–3 years |
| **DE filter** | $200–$500 | $400–$800 (grid set) | Superior filtration, higher maintenance |
| **Pool lighting** | $65–$150 (gasket/seal) | $800–$1,700 (LED fixture) | Must be installed by licensed electrician; VGB compliance required |
| **Salt chlorinator cell** | — | $600–$1,200 (40k gal) | Replace every 3–5 years |
| **Salt control board** | — | $500–$900 | |
| **Plumbing leaks** | $200–$400 (above-ground) | $200–$1,000+ (under-deck) | |
| **Drain covers/grates** | $20–$50 (cover only) | +labour for install & pressure test | VGB compliance required |

---

## Quoting App Implementation Notes

### Key Measurement Variables (per the app's pool sub-types)

#### Pool Opening
- `gallons` — Pool volume; drives chemical quantities and service time
- `cover_type` — 1=none, 2=mesh, 3=solid; affects labour hours and cover storage fee
- `water_features` — Each adds ~1 hour at startup
- `spa` — 0=no, 1=yes; adds ~1.5 hours

#### Pool Closing / Winterization
- `gallons` — Drives antifreeze quantity and vacuum time
- `cover_type` — 1=solid tarp, 2=mesh safety, 3=none
- `water_features` — Each adds ~$65 overhead for winterization
- `spa_type` — 0=none, 1=portable ($125), 2=inground ($205)

#### Monthly Maintenance
- `gallons` — Drives chemical monthly consumption
- `visits` — Visits per month (typically 4 for weekly service)
- `saltwater` — 0=no, 1=yes; adds cell inspection and salt/phosphate testing
- `spa` — 0=no, 1=yes; adds 0.3 hrs/visit
- `vacuum_addon` — 0=no, 1=yes; adds 0.5 hrs/visit
- `water_features` — Each adds 0.15 hrs per 2 visits

#### Equipment Repair
- `pump_job` — 0=none, 1=repair ($250–$800), 2=replace VS pump ($1,500–$2,500)
- `heater_job` — 0=none, 1=gas repair, 2=heat pump repair, 3=heat exchanger
- `filter_type` — 0=none, 1=sand, 2=cartridge, 3=DE
- `light_job` — 0=none, 1=seal repair, 2=LED replacement (requires permit)
- `salt_cell` — Number of cells to replace
- `plumb_repair` — Number of leak repair jobs

### Recommended Profit Margins for Pool Service
- **Residential maintenance**: 40–55% (competitive market)
- **Commercial maintenance**: 50–60%
- **Equipment repair / replacement**: 55–65%
- **Seasonal opening/closing**: 50–60%

*Note: Pool service industry net margins average ~18%. The app's 3-tier pricing (Conservative/Standard/Premium) maps well to competitive/standard/premium markets.*

---

*Last updated: 2026 · Sources: HomeGuide Pool Service Cost Guide, Baker Pool Service (2025 pricing card), Bluewater Pool Services, Pool Founder cost-plus framework*

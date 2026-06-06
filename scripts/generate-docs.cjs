#!/usr/bin/env node
/**
 * TTC Estimator — PDF Guide Generator
 * Generates Getting Started, Pro Plan, and Enterprise Plan guides
 * Output: estimator/public/docs/*.pdf
 */

const { jsPDF } = require('../estimator/node_modules/jspdf/dist/jspdf.node.js')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../estimator/public/docs')
fs.mkdirSync(OUT, { recursive: true })

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  indigo:    [49,  46,  129],
  indigoMid: [79,  70,  229],
  indigoLt:  [224, 231, 255],
  amber:     [245, 158, 11],
  amberLt:   [254, 243, 199],
  green:     [22,  163, 74],
  greenLt:   [220, 252, 231],
  red:       [220, 38,  38],
  redLt:     [254, 226, 226],
  purple:    [124, 58,  237],
  purpleLt:  [237, 233, 254],
  white:     [255, 255, 255],
  gray900:   [17,  24,  39],
  gray700:   [55,  65,  81],
  gray500:   [107, 114, 128],
  gray300:   [209, 213, 219],
  gray100:   [243, 244, 246],
  gray50:    [249, 250, 251],
}

// ─── Layout Constants ─────────────────────────────────────────────────────────
const PW = 210   // page width mm
const PH = 297   // page height mm
const ML = 18    // margin left
const MR = 18    // margin right
const CW = PW - ML - MR  // content width

// ─── Helper Class ─────────────────────────────────────────────────────────────
class Doc {
  constructor() {
    this.pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    this.y = 0
    this.pageNum = 1
    this._addPageNum()
  }

  _addPageNum() {
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...C.gray500)
    this.pdf.text(`Page ${this.pageNum}`, PW / 2, PH - 8, { align: 'center' })
    this.pdf.text('© Top Trade Contractor · XpertAISolution.com', PW / 2, PH - 4, { align: 'center' })
  }

  newPage() {
    this.pdf.addPage()
    this.pageNum++
    this._addPageNum()
    this.y = 20
  }

  checkSpace(needed) {
    if (this.y + needed > PH - 20) this.newPage()
  }

  // Filled rectangle helper
  box(x, y, w, h, color) {
    this.pdf.setFillColor(...color)
    this.pdf.rect(x, y, w, h, 'F')
  }

  // Rounded box (simulated with rect)
  rbox(x, y, w, h, color) {
    this.pdf.setFillColor(...color)
    this.pdf.roundedRect(x, y, w, h, 2, 2, 'F')
  }

  // Cover page
  cover(title, subtitle, planColor, planLabel) {
    // Dark indigo background
    this.box(0, 0, PW, 80, C.indigo)
    // Amber accent bar
    this.box(0, 80, PW, 4, C.amber)

    // Logo area
    this.pdf.setFillColor(...C.amber)
    this.pdf.roundedRect(ML, 18, 28, 28, 3, 3, 'F')
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(14)
    this.pdf.setTextColor(...C.indigo)
    this.pdf.text('TTC', ML + 14, 36, { align: 'center' })

    // Title
    this.pdf.setTextColor(...C.white)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(26)
    this.pdf.text(title, ML + 34, 32)

    // Subtitle
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(13)
    this.pdf.setTextColor(199, 210, 254)
    const subtitleLines = this.pdf.splitTextToSize(subtitle, CW - 34)
    this.pdf.text(subtitleLines, ML + 34, 43)

    // Company name
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(165, 180, 252)
    this.pdf.text('Top Trade Contractor · Powered by XpertAISolution.com', ML + 34, 72)

    // Plan badge
    this.rbox(ML, 90, 55, 10, planColor)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(11)
    this.pdf.setTextColor(...C.white)
    this.pdf.text(planLabel, ML + 27.5, 96.5, { align: 'center' })

    // Date
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...C.gray500)
    this.pdf.text(`Version 1.0 · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`, PW - MR, 96.5, { align: 'right' })

    this.y = 112
  }

  // Section header (large)
  h1(text) {
    this.checkSpace(16)
    this.box(ML, this.y, CW, 10, C.indigoMid)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(13)
    this.pdf.setTextColor(...C.white)
    this.pdf.text(text, ML + 4, this.y + 7)
    this.y += 15
  }

  // Sub-section header
  h2(text) {
    this.checkSpace(12)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(11)
    this.pdf.setTextColor(...C.indigoMid)
    this.pdf.text(text, ML, this.y)
    this.y += 1.5
    this.pdf.setDrawColor(...C.amber)
    this.pdf.setLineWidth(0.6)
    this.pdf.line(ML, this.y, ML + CW, this.y)
    this.y += 6
  }

  // Sub-sub header
  h3(text) {
    this.checkSpace(9)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(10)
    this.pdf.setTextColor(...C.gray900)
    this.pdf.text(text, ML, this.y)
    this.y += 7
  }

  // Body paragraph
  p(text, color) {
    const lines = this.pdf.splitTextToSize(text, CW)
    const needed = lines.length * 5.5
    this.checkSpace(needed)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(9.5)
    this.pdf.setTextColor(...(color || C.gray700))
    this.pdf.text(lines, ML, this.y)
    this.y += needed + 2
  }

  // Bullet list
  bullets(items, indent) {
    indent = indent || 0
    items.forEach(item => {
      const x = ML + indent
      const lines = this.pdf.splitTextToSize('• ' + item, CW - indent)
      const needed = lines.length * 5.2
      this.checkSpace(needed)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setFontSize(9.5)
      this.pdf.setTextColor(...C.gray700)
      this.pdf.text(lines, x, this.y)
      this.y += needed + 1.5
    })
    this.y += 2
  }

  // Numbered step
  step(num, title, desc) {
    this.checkSpace(20)
    // Circle
    this.pdf.setFillColor(...C.indigoMid)
    this.pdf.circle(ML + 4, this.y + 3.5, 4, 'F')
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...C.white)
    this.pdf.text(String(num), ML + 4, this.y + 4.8, { align: 'center' })
    // Title
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(10)
    this.pdf.setTextColor(...C.gray900)
    this.pdf.text(title, ML + 11, this.y + 4)
    this.y += 9
    // Description
    if (desc) {
      const lines = this.pdf.splitTextToSize(desc, CW - 11)
      this.pdf.setFont('helvetica', 'normal')
      this.pdf.setFontSize(9)
      this.pdf.setTextColor(...C.gray700)
      this.pdf.text(lines, ML + 11, this.y)
      this.y += lines.length * 5 + 4
    }
  }

  // Callout box (tip, warning, info)
  callout(type, text) {
    const configs = {
      tip:     { bg: C.greenLt,  border: C.green,    icon: '✓ TIP',     tc: C.green  },
      warn:    { bg: C.amberLt,  border: C.amber,    icon: '⚠ NOTE',    tc: [180, 100, 0] },
      info:    { bg: C.indigoLt, border: C.indigoMid, icon: 'ℹ INFO',   tc: C.indigoMid },
      feature: { bg: C.purpleLt, border: C.purple,   icon: '★ FEATURE', tc: C.purple },
    }
    const cfg = configs[type] || configs.info
    const lines = this.pdf.splitTextToSize(text, CW - 14)
    const h = lines.length * 5.2 + 12
    this.checkSpace(h + 2)
    this.rbox(ML, this.y, CW, h, cfg.bg)
    this.pdf.setDrawColor(...cfg.border)
    this.pdf.setLineWidth(0.8)
    this.pdf.line(ML + 1, this.y + 1, ML + 1, this.y + h - 1)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...cfg.tc)
    this.pdf.text(cfg.icon, ML + 5, this.y + 6)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...C.gray700)
    this.pdf.text(lines, ML + 5, this.y + 12)
    this.y += h + 4
  }

  // Feature comparison table
  featureTable(rows) {
    const colW = [CW * 0.52, CW * 0.16, CW * 0.16, CW * 0.16]
    const rowH = 8
    this.checkSpace(rowH * (rows.length + 1) + 5)
    // Header
    const headers = ['Feature', 'Free', 'Pro', 'Enterprise']
    const hColors = [C.gray900, C.gray700, C.indigoMid, C.purple]
    let xPos = ML
    this.box(ML, this.y, CW, rowH, C.gray900)
    headers.forEach((h, i) => {
      this.pdf.setFont('helvetica', 'bold')
      this.pdf.setFontSize(8.5)
      this.pdf.setTextColor(...C.white)
      this.pdf.text(h, xPos + colW[i] / 2, this.y + 5.5, { align: 'center' })
      xPos += colW[i]
    })
    this.y += rowH
    // Rows
    rows.forEach((row, ri) => {
      const bgColor = ri % 2 === 0 ? C.white : C.gray50
      this.box(ML, this.y, CW, rowH, bgColor)
      this.pdf.setDrawColor(...C.gray300)
      this.pdf.setLineWidth(0.2)
      this.pdf.line(ML, this.y + rowH, ML + CW, this.y + rowH)
      xPos = ML
      row.forEach((cell, ci) => {
        this.pdf.setFont('helvetica', ci === 0 ? 'normal' : 'bold')
        this.pdf.setFontSize(8.5)
        if (ci === 0) {
          this.pdf.setTextColor(...C.gray700)
          this.pdf.text(cell, xPos + 2, this.y + 5.5)
        } else {
          const isCheck = cell === '✓'
          const isCross = cell === '—'
          let tc
          if (isCheck) tc = [22, 163, 74]
          else if (isCross) tc = [107, 114, 128]
          else tc = C.indigoMid
          this.pdf.setTextColor(...tc)
          this.pdf.text(cell, xPos + colW[ci] / 2, this.y + 5.5, { align: 'center' })
        }
        xPos += colW[ci]
      })
      this.y += rowH
    })
    this.y += 6
  }

  // Button mockup
  btnMockup(label, color, width) {
    width = width || 50
    const h = 7
    this.checkSpace(12)
    this.rbox(ML, this.y, width, h, color || C.indigoMid)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...C.white)
    this.pdf.text(label, ML + width / 2, this.y + 5, { align: 'center' })
    this.y += 12
  }

  // Nav tab mockup
  navMockup(tabs, active) {
    this.checkSpace(12)
    let xPos = ML
    tabs.forEach((tab, i) => {
      const isActive = tab === active
      this.rbox(xPos, this.y, 32, 8, isActive ? C.indigoMid : C.gray100)
      this.pdf.setFont('helvetica', isActive ? 'bold' : 'normal')
      this.pdf.setFontSize(8)
      this.pdf.setTextColor(...(isActive ? C.white : C.gray500))
      this.pdf.text(tab, xPos + 16, this.y + 5.5, { align: 'center' })
      xPos += 34
    })
    this.y += 14
  }

  // Divider
  divider() {
    this.checkSpace(8)
    this.pdf.setDrawColor(...C.gray300)
    this.pdf.setLineWidth(0.3)
    this.pdf.line(ML, this.y, ML + CW, this.y)
    this.y += 6
  }

  // Spacer
  space(mm) { this.y += (mm || 4) }

  // Label-value pair
  kv(label, value) {
    this.checkSpace(7)
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...C.gray700)
    this.pdf.text(label + ':', ML, this.y)
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setTextColor(...C.gray900)
    this.pdf.text(value, ML + 45, this.y)
    this.y += 6.5
  }

  // Table of Contents entry
  tocEntry(title, page, level) {
    this.checkSpace(7)
    const indent = (level || 0) * 6
    const dotWidth = CW - indent - 20
    this.pdf.setFont('helvetica', level ? 'normal' : 'bold')
    this.pdf.setFontSize(level ? 9 : 10)
    this.pdf.setTextColor(...(level ? C.gray700 : C.gray900))
    this.pdf.text(title, ML + indent, this.y)
    // Dots
    this.pdf.setFont('helvetica', 'normal')
    this.pdf.setFontSize(8)
    this.pdf.setTextColor(...C.gray300)
    const titleW = this.pdf.getTextWidth(title)
    const dotStr = '.'.repeat(Math.floor((dotWidth - titleW) / this.pdf.getTextWidth('.')))
    this.pdf.text(dotStr, ML + indent + titleW + 2, this.y)
    // Page
    this.pdf.setFont('helvetica', 'bold')
    this.pdf.setFontSize(9)
    this.pdf.setTextColor(...C.indigoMid)
    this.pdf.text(String(page), ML + CW, this.y, { align: 'right' })
    this.y += 7
  }

  save(filename) {
    const buf = Buffer.from(this.pdf.output('arraybuffer'))
    const fullPath = path.join(OUT, filename)
    fs.writeFileSync(fullPath, buf)
    console.log(`✓ Generated: ${filename} (${(buf.length / 1024).toFixed(1)} KB)`)
    return fullPath
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE 1: GETTING STARTED
// ═══════════════════════════════════════════════════════════════════════════════
function generateGettingStarted() {
  const d = new Doc()

  // Cover
  d.cover(
    'Getting Started Guide',
    'Complete walkthrough of TTC Estimator — setup, features, and everything you need to win more bids.',
    C.indigoMid,
    '✦  All Plans  ✦'
  )

  // Table of Contents
  d.h1('Table of Contents')
  d.tocEntry('1. Welcome to TTC Estimator', 3)
  d.tocEntry('What is TTC Estimator?', 3, 1)
  d.tocEntry('Free Plan — What\'s Included', 3, 1)
  d.tocEntry('2. Creating Your Account', 3)
  d.tocEntry('Sign Up Steps', 3, 1)
  d.tocEntry('Email Confirmation', 4, 1)
  d.tocEntry('3. The Onboarding Wizard', 4)
  d.tocEntry('Step 1 — Personal Information', 4, 1)
  d.tocEntry('Step 2 — Business Details', 4, 1)
  d.tocEntry('Step 3 — Branding & Logo', 5, 1)
  d.tocEntry('4. Navigating the App', 5)
  d.tocEntry('Top Navigation Bar', 5, 1)
  d.tocEntry('Estimator Tab', 5, 1)
  d.tocEntry('CRM Tab', 5, 1)
  d.tocEntry('5. Creating an Estimate', 6)
  d.tocEntry('Client Information', 6, 1)
  d.tocEntry('Project Type & Sub-Type', 6, 1)
  d.tocEntry('Measurements', 7, 1)
  d.tocEntry('Materials, Labor & Overhead', 7, 1)
  d.tocEntry('Scope of Work & Notes', 8, 1)
  d.tocEntry('6. Reading Your Results', 8)
  d.tocEntry('Contractor View', 8, 1)
  d.tocEntry('Client Quote View', 9, 1)
  d.tocEntry('3-Tier Pricing Explained', 9, 1)
  d.tocEntry('7. Exporting Your Estimate', 9)
  d.tocEntry('PDF Export', 10, 1)
  d.tocEntry('Print', 10, 1)
  d.tocEntry('8. Saving & Managing Estimates', 10)
  d.tocEntry('9. Company Settings', 11)
  d.tocEntry('10. The CRM — Managing Clients', 12)
  d.tocEntry('11. The "Need a Website?" Feature', 13)
  d.tocEntry('12. Upgrading Your Plan', 14)
  d.tocEntry('13. Getting Help', 14)

  // ── Section 1 ──────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('1. Welcome to TTC Estimator')
  d.h2('What Is TTC Estimator?')
  d.p('TTC Estimator is a professional contractor estimating and CRM platform built by Top Trade Contractor (powered by XpertAISolution.com). It is designed specifically for trade contractors — painters, roofers, concrete specialists, electricians, plumbers, fence installers, and more — who need to produce accurate, professional estimates quickly and manage their client relationships in one place.')
  d.p('Every user has a completely private, isolated account. Your clients, estimates, pricing, and company data are never visible to other users on the platform.')

  d.h2('Free Plan — What\'s Included')
  d.p('Your free account includes everything you need to get started:')
  d.bullets([
    'Up to 3 estimates (upgrade for unlimited)',
    'All 18 project types with auto-populated cost formulas',
    'PDF export for professional client quotes',
    'Contractor View (full cost breakdown with margins)',
    'Client Quote View (clean pricing only)',
    '3-Tier pricing — Conservative, Standard, Premium',
    'Company Settings (logo, contact info, payment terms)',
    'Print-ready output',
  ])
  d.callout('tip', 'Upgrade to Pro for unlimited estimates, Word export, full CRM functionality, and more — all for $29/month.')

  // ── Section 2 ──────────────────────────────────────────────────────────────
  d.h1('2. Creating Your Account')
  d.h2('Sign Up Steps')
  d.step(1, 'Go to the TTC Estimator website', 'Navigate to xpertaisolution.com (or your assigned app URL). You will see the landing page with a "Create Account" tab on the right side of the screen.')
  d.step(2, 'Click "Create Account"', 'On the right panel, click the "Create Account" tab to switch from Sign In to the signup form.')
  d.step(3, 'Enter your full name', 'Type your first and last name in the Full Name field. This is how your name will appear throughout the app.')
  d.step(4, 'Enter your email address', 'Use a valid email address — this is your login and where we send important updates and your guide files.')
  d.step(5, 'Create a strong password', 'Your password must be at least 6 characters. Use a mix of letters, numbers, and symbols for security.')
  d.step(6, 'Click "Create Account"', 'Tap the blue "Create Account" button. You will see a success message asking you to check your email.')

  d.h2('Email Confirmation')
  d.p('After signing up, TTC sends an automated confirmation email to verify your address. You must confirm your email before you can log in.')
  d.step(1, 'Open your email inbox', 'Look for an email from TTC Estimator / XpertAISolution.com. Check your Spam or Junk folder if you do not see it within 2 minutes.')
  d.step(2, 'Click "Confirm your email"', 'Click the confirmation link in the email. You will be redirected back to the app and automatically signed in.')
  d.step(3, 'Receive your Getting Started guide', 'Upon confirmation, this Getting Started PDF guide and your plan guide are automatically sent to your email for reference.')
  d.callout('warn', 'The confirmation link expires after 24 hours. If it expires, go back to the sign-in page, enter your credentials, and request a new link using "Forgot password?" or contact support.')

  // ── Section 3 ──────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('3. The Onboarding Wizard')
  d.p('The first time you sign in after confirming your email, you are taken through a 3-step setup wizard. This collects your personal and business details so TTC can personalize your experience and auto-fill your estimates and invoices.')
  d.callout('info', 'The wizard takes about 2–3 minutes. All fields marked with an asterisk (*) are required. You can always update this information later in Company Settings.')

  d.h2('Step 1 — Personal Information')
  d.p('This step collects your personal contact details:')
  d.bullets([
    'First Name* — Your first name',
    'Last Name* — Your last name',
    'Phone Number* — Your personal or business contact number (used on estimates)',
    'Address — Your personal or business street address',
    'City, State, ZIP — Your location for estimate templates',
  ])
  d.callout('tip', 'Click the "Continue" button after filling in the required fields to advance to the next step. Use "Back" to return to a previous step at any time.')

  d.h2('Step 2 — Business Details')
  d.p('Enter your business information. This appears on all estimates and client-facing documents:')
  d.bullets([
    'Business Type* — Select your trade from the dropdown (Painting, Roofing, Concrete, Electrical, Plumbing, Fencing, Landscaping, HVAC, Flooring, Drywall, Masonry, Carpentry, Tile & Stone, Insulation, Siding, Windows & Doors, General Contractor, Other)',
    'Business Name* — Your company\'s legal or operating name (e.g., "Smith Contracting LLC")',
    'Business Address — Your company\'s mailing or physical address',
    'Business City, State, ZIP — Used for invoice headers',
    'Business Phone* — Your main business phone number',
    'Business Email — Your business contact email (customers reply to this)',
    'Website — Your company website URL (optional)',
  ])

  d.h2('Step 3 — Branding & Logo')
  d.p('Upload your company logo and add any additional business details:')
  d.bullets([
    'Business Logo — Click the upload area to select an image (PNG, JPG, or SVG). Max 5 MB. Your logo appears on PDF exports and the app header.',
    'Business Details — A free-text field for taglines, specialties, certifications, or any other info you want on quotes (e.g., "Licensed & Insured · 20 years experience").',
    'License Number — Your contractor license number (appears on quotes for credibility).',
    'Insurance — Your insurance provider or policy number (optional but recommended for professionalism).',
  ])
  d.step(1, 'Click "Finish Setup"', 'After completing Step 3, click "Finish Setup" to save your information. You will be taken directly to the Estimator.')
  d.callout('info', 'All the information you enter flows automatically into every new estimate, invoice header, and PDF export. You never have to type your company info again.')

  // ── Section 4 ──────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('4. Navigating the App')
  d.h2('Top Navigation Bar')
  d.p('The navigation bar at the top of every page contains:')
  d.navMockup(['TTC Logo', 'Estimator', 'CRM', 'User Menu'], 'Estimator')
  d.bullets([
    'TTC Logo (top-left) — Click to return to the Estimator page from anywhere in the app.',
    'Estimator tab — Opens the main estimating workspace where you create and manage quotes.',
    'CRM tab — Opens the Client Relationship Manager to track clients, leads, and projects.',
    'Admin tab (admin accounts only) — Opens the Admin Command Center for managing all users and billing.',
    'User Menu (top-right, your initials) — Click to view your account email and sign out.',
  ])

  d.h2('Estimator Tab')
  d.p('The Estimator is the core of TTC. It is split into two panels:')
  d.bullets([
    'Left Panel — The form where you enter all estimate details (client info, project type, measurements, materials, labor, overhead, and notes).',
    'Right Panel (desktop only) — Live results that update in real-time as you fill in the form, showing cost breakdowns and client-ready quotes.',
    'On mobile — Toggle between "Contractor View" and "Client View" using the buttons at the bottom of the screen.',
  ])

  d.h2('CRM Tab')
  d.p('The CRM (Client Relationship Manager) is your central hub for managing relationships:')
  d.bullets([
    'Client list — Every client and lead you have ever added, with status, last contact, and project value.',
    'Client profiles — Click any client to see their full history, estimates, notes, and contact details.',
    'Pipeline statuses — Mark clients as Prospect, Active, Completed, On-Hold, or Declined.',
    'Notes — Add timestamped notes to any client record.',
  ])

  // ── Section 5 ──────────────────────────────────────────────────────────────
  d.h1('5. Creating an Estimate')
  d.p('Every new estimate starts fresh. Click the "+ New Estimate" button in the header to reset the form, or simply start filling in the fields on the left panel.')

  d.h2('Client Information')
  d.p('The "Client Information" section is always expanded at the top of the left panel. Fill in:')
  d.bullets([
    'Client Name* — The name of the person or company you are quoting.',
    'Company — The client\'s company name (if applicable; leave blank for residential).',
    'Address — The client\'s billing address.',
    'City, State, ZIP — Used on the client quote view.',
    'Phone — Client\'s contact phone (optional but useful for follow-up).',
    'Email — Client\'s email address.',
  ])
  d.callout('tip', 'Client information appears on all PDF exports in the "Prepared For:" section. Fill this in carefully as clients will see it on their quote.')

  d.h2('Project Type & Sub-Type')
  d.p('The "Project Type" section is one of TTC\'s most powerful features. It auto-populates your materials, labor, and overhead based on industry-standard formulas.')
  d.step(1, 'Click "Select project type"', 'A grid of 18 project category cards appears. Each card shows an icon and the project name.')
  d.step(2, 'Select your trade category', 'Click the card that matches your project (e.g., "Painting", "Concrete", "Roofing"). The card highlights in indigo when selected.')
  d.step(3, 'Select a sub-type', 'After choosing a category, a second row of sub-types appears below (e.g., for Painting: Interior Walls, Exterior Siding, Cabinet Refinishing, Deck/Fence Staining, etc.).')
  d.step(4, 'Add a project description', 'Use the free-text "Project Description" field to describe the specific scope (e.g., "2-story colonial, full exterior paint, includes trim and shutters").')
  d.step(5, 'Add the job address', 'Enter the physical address where the work will be performed. This appears on the quote and is separate from the client\'s billing address.')
  d.callout('feature', 'TTC includes 18 main project categories with detailed sub-types: Painting, Concrete, Fencing, Roofing, Electrical, Plumbing, Landscaping, HVAC, Flooring, Drywall, Masonry, Carpentry, Tile & Stone, Insulation, Siding, Windows & Doors, General Contracting, and Custom.')

  d.newPage()
  d.h2('Measurements')
  d.p('After selecting a sub-type, a "Measurements" section appears with input fields specific to your project type. These drive all calculations.')
  d.bullets([
    'Each measurement field has a label (e.g., "Square Footage", "Linear Feet", "Number of Stories") and a unit.',
    'Enter the actual measured values from your site visit or blueprint.',
    'After entering measurements, click "↺ Re-calculate materials & labor from measurements" to update all line items.',
    'All quantities are calculated automatically using built-in industry formulas — no manual math required.',
  ])
  d.callout('tip', 'Always measure carefully. The formulas include standard waste factors and coverage rates, but entering accurate field measurements is critical for profitable quotes.')

  d.h2('Materials, Labor & Overhead')
  d.p('These three sections form the financial backbone of your estimate.')
  d.h3('Materials Table')
  d.p('Auto-populated from your measurements. Each row includes:')
  d.bullets([
    'Category — Type of material (e.g., Paint, Lumber, Concrete)',
    'Item Name — Specific material or product',
    'Quantity — Calculated from your measurements',
    'Unit — Unit of measure (gallon, sheet, bag, linear ft, etc.)',
    'Unit Cost ($) — Your material cost per unit',
    'Markup % — Your markup on this material (default from Settings)',
    'Notes — Optional notes about the material or supplier',
    '+ Add Material — Click to add custom items not in the auto-populated list',
    'Trash icon — Remove any line item you do not need',
  ])

  d.h3('Labor Table')
  d.p('Auto-populated with labor tasks for your selected sub-type:')
  d.bullets([
    'Task Description — What labor activity this covers',
    'Workers — Number of workers for this task',
    'Hours — Estimated hours (calculated from measurements)',
    'Rate/Hour ($) — Hourly rate per worker',
    'Notes — Notes about this labor item',
    '+ Add Labor — Add custom labor items',
  ])

  d.h3('Overhead & Equipment')
  d.p('Covers non-material, non-labor project costs:')
  d.bullets([
    'Description — What the overhead covers (e.g., Equipment rental, Permits, Dumpster, Travel)',
    'Cost ($) — Fixed dollar amount for this overhead item',
    '+ Add Overhead — Add custom overhead items',
  ])
  d.callout('warn', 'Do not forget overhead items like permit fees, equipment rental, disposal, and travel. These are often overlooked and can significantly impact your profitability.')

  d.h2('Scope of Work & Notes')
  d.p('The "Scope of Work & Notes" section (collapsed by default — click the header to expand) contains three text fields:')
  d.bullets([
    'Scope of Work — A detailed description of exactly what is included in this estimate. This appears on the client quote and defines your contractual obligations.',
    'Exclusions — Clearly state what is NOT included (e.g., "Does not include drywall repair", "Excludes electrical work"). This protects you from scope creep.',
    'Internal Notes — Private notes visible only to you in the Contractor View. Never shown to clients. Use for reminders, supplier contacts, or special instructions.',
  ])

  // ── Section 6 ──────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('6. Reading Your Results')
  d.p('The right panel (or the bottom toggle on mobile) shows your live estimate results. Toggle between two views using the tabs at the top of the right panel:')
  d.navMockup(['🔒 Contractor View', '👤 Client Quote View'], '🔒 Contractor View')

  d.h2('Contractor View')
  d.p('The Contractor View is for your eyes only. It shows your full financial breakdown:')
  d.bullets([
    'Material Cost — Total raw material cost (before markup)',
    'Material with Markup — Materials after your markup percentage is applied',
    'Labor Cost — Total labor (workers × hours × rate)',
    'Overhead — Total overhead and equipment costs',
    'Total Direct Cost — Sum of all costs before margin',
    'Gross Margin % — Your target profit margin',
    'Final Quote Prices — For all three pricing tiers (Conservative, Standard, Premium)',
    'Per-Tier Profit — Exact dollar profit at each pricing tier',
  ])
  d.callout('info', 'The margin controls in the Contractor View let you adjust the three pricing tiers on the fly. Drag the sliders or type new values to instantly see how it affects your quote price and profit.')

  d.h2('Client Quote View')
  d.p('The Client Quote View shows a clean, professional document that your client receives. It includes:')
  d.bullets([
    'Your company logo, name, address, and contact details',
    'Client name and project address',
    'Estimate number and validity date',
    'Three pricing options — Conservative, Standard, and Premium',
    'Scope of Work and Exclusions',
    'Payment terms and warranty',
    'A professional signature / acceptance line',
  ])
  d.callout('tip', 'Presenting 3 pricing tiers is a proven sales technique. Most clients choose the middle (Standard) option, which is often your best margin tier.')

  d.h2('3-Tier Pricing Explained')
  d.p('TTC automatically calculates three quote prices from your costs:')
  d.bullets([
    'Conservative — Your lowest quote using the minimum margin setting. Use this to win highly competitive bids.',
    'Standard — Your middle quote using your standard margin. This should be your default recommendation to clients.',
    'Premium — Your highest quote using the maximum margin setting. Appropriate for complex jobs, premium clients, or when you are at full capacity.',
  ])
  d.p('You control the margin percentages for each tier in Company Settings (defaulting to 55% / 60% / 65%). The selected tier at time of PDF export determines which price appears on the client quote.')

  // ── Section 7 ──────────────────────────────────────────────────────────────
  d.h1('7. Exporting Your Estimate')
  d.p('The Export Bar at the bottom of the screen (or bottom of the right panel on desktop) contains all export options:')

  d.h2('PDF Export')
  d.step(1, 'Select your pricing tier', 'In the Contractor View, click the tier radio button (Conservative, Standard, or Premium) you want reflected on the client quote.')
  d.step(2, 'Choose your view', 'Click "🔒 Contractor View" to export the full internal breakdown, or "👤 Client Quote View" to export the clean client-facing version.')
  d.step(3, 'Click "PDF"', 'The PDF button in the Export Bar generates and downloads a professional PDF instantly.')
  d.callout('info', 'The PDF Contractor View includes all cost details, margins, and internal notes. The Client PDF is clean — it only shows the quote price, scope, terms, and your branding.')

  d.h2('Print')
  d.step(1, 'Click "Print"', 'Opens your browser\'s print dialog. The app automatically applies print-friendly CSS — navigation bars and internal tools are hidden.')
  d.step(2, 'Select destination', 'Choose your printer or "Save as PDF" to save directly from the browser\'s built-in PDF exporter.')

  // ── Section 8 ──────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('8. Saving & Managing Estimates')

  d.h2('Auto-Save')
  d.p('TTC automatically saves your current estimate every 30 seconds to local storage. You will never lose work mid-session due to an accidental refresh or browser close.')

  d.h2('Manual Save')
  d.p('Click the "Save" button in the Export Bar or the "Save" button in the header at any time to immediately save your current estimate.')

  d.h2('Viewing Saved Estimates')
  d.step(1, 'Click "Saved Estimates"', 'Click the clock/history icon or "Saved Estimates" button in the top header.')
  d.step(2, 'Browse your estimate list', 'A drawer opens from the right showing all your saved estimates sorted by date. Each row shows: Estimate #, Client Name, Project Type, Quote Amount, and Status.')
  d.step(3, 'Load an estimate', 'Click any estimate to load it back into the form. All fields, measurements, materials, and settings are restored exactly as saved.')
  d.step(4, 'Delete an estimate', 'Click the trash icon next to any saved estimate to permanently delete it. This action cannot be undone.')

  d.h2('Estimate Statuses')
  d.bullets([
    'Draft — Estimate is being worked on, not yet sent to a client.',
    'Sent — Estimate has been sent to the client for review.',
    'Accepted — Client has accepted the quote. Ready to convert to invoice.',
    'Declined — Client declined the quote.',
  ])
  d.callout('tip', 'Free plan users are limited to 3 saved estimates. When you reach the limit, you will be prompted to upgrade to Pro for unlimited estimates.')

  d.h2('Converting to Invoice')
  d.p('Once a client accepts a quote, click the "Convert to Invoice" button in the header. This changes the document type from "Estimate" to "Invoice" and updates the status automatically. The invoice keeps all the same line items and pricing.')

  // ── Section 9 ──────────────────────────────────────────────────────────────
  d.h1('9. Company Settings')
  d.p('Company Settings is where you configure all the details that appear on your estimates and invoices. Access it by clicking the Settings (gear) icon in the top header or through the user menu.')

  d.h2('Company Information')
  d.bullets([
    'Company Name — Your legal or trade name (appears at the top of all documents)',
    'Owner Name — Your name as it appears on signature lines',
    'Address, City, State, ZIP — Your company address for document headers',
    'Phone — Business phone for client contact',
    'Email — Business email address',
    'Website — Your website URL',
    'License # — Your contractor license number',
    'Insurance — Your insurance details',
    'Logo — Upload or replace your company logo (PNG/JPG, max 2MB)',
  ])

  d.h2('Default Financial Settings')
  d.p('These defaults populate every new estimate automatically:')
  d.bullets([
    'Default Material Markup % — Your standard markup on all materials (default: 30%)',
    'Conservative Margin % — Your minimum profit margin for the low-tier price (default: 55%)',
    'Standard Margin % — Your target profit margin for the mid-tier price (default: 60%)',
    'Premium Margin % — Your maximum margin for the high-tier price (default: 65%)',
    'Tax Rate % — Sales tax to apply to materials (default: 0%)',
    'Currency — USD, CAD, MXN, etc.',
  ])

  d.h2('Default Document Settings')
  d.bullets([
    'Payment Terms — Default payment terms text (e.g., "50% deposit required to schedule. Balance due upon completion.").',
    'Warranty — Your standard warranty statement (e.g., "1-year warranty on all labor.").',
    'Quote Validity Days — How many days the quote is valid (default: 30 days). Appears on client quote as "Valid until [date]".',
  ])
  d.callout('tip', 'Setting accurate default margins and markups is the single most important thing you can do to protect your profitability. Review these numbers carefully before creating your first client estimate.')

  // ── Section 10 ─────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('10. The CRM — Managing Clients')
  d.p('The CRM (Client Relationship Manager) tab keeps every client, lead, and project organized in one place. Access it by clicking "CRM" in the top navigation bar.')

  d.h2('Adding a New Client')
  d.step(1, 'Click "+ New Client"', 'The bright blue button in the top-right of the CRM page opens a new client form.')
  d.step(2, 'Fill in client details', 'Name is required. Add contact info, address, source (how you found them), and any initial tags (e.g., "Residential", "Repeat Customer").')
  d.step(3, 'Set the status', 'Choose the pipeline status: Prospect (new inquiry), Active (ongoing work), Completed, On-Hold, or Declined.')
  d.step(4, 'Save', 'Click "Save Client" to add them to your CRM.')

  d.h2('Client Pipeline Statuses')
  d.bullets([
    'Prospect (blue) — A lead or potential customer. Has not yet committed.',
    'Active (green) — A current client with work underway or accepted quote.',
    'Completed (purple) — Project is finished. Good candidate for review requests and repeat business outreach.',
    'On-Hold (yellow) — Project paused. Check in periodically.',
    'Declined (red) — Client did not move forward. Useful to track loss reasons.',
  ])

  d.h2('Client Profile')
  d.p('Click any client name to open their full profile, which includes:')
  d.bullets([
    'Contact Information — All contact details you entered, with quick-dial and email links',
    'Estimate History — Every estimate linked to this client with amounts, status, and dates',
    'Notes Timeline — Chronological log of all notes added to this client',
    'Total Value — Lifetime value of all estimates/invoices associated with this client',
    'Source — How you acquired this client (walk-in, referral, website, etc.)',
  ])

  d.h2('Adding Notes')
  d.step(1, 'Open a client profile', 'Click the client\'s name from the CRM list.')
  d.step(2, 'Click "Add Note"', 'A text input appears at the top of the notes timeline.')
  d.step(3, 'Type your note', 'Notes can be any length. Use them for: follow-up reminders, meeting summaries, client preferences, special instructions, or complaint logs.')
  d.step(4, 'Click "Save Note"', 'The note is saved with a timestamp and appears at the top of the timeline.')

  d.h2('Searching & Filtering Clients')
  d.bullets([
    'Search Bar — Type any part of a client\'s name, company, email, or phone to filter the list instantly.',
    'Status Filter — Click a status badge at the top of the CRM to show only clients with that status.',
    'Sort — Click column headers to sort by name, date added, or total value.',
  ])

  // ── Section 11 ─────────────────────────────────────────────────────────────
  d.h1('11. The "Need a Website?" Feature')
  d.p('TTC includes a built-in lead generation tool for XpertAISolution.com web design services. A floating "Need a Website?" button appears at the bottom-right corner of every app page.')
  d.callout('info', 'This feature is entirely optional. It opens an interest form for business owners who want a professional website. Your data is never shared or sold.')

  d.step(1, 'Click "Need a Website?"', 'A modal dialog opens with information about web design services starting from $1,200.')
  d.step(2, 'Click "Get a Free Quote"', 'Advances to the interest form. (Click "Maybe Later" to close without submitting anything.)')
  d.step(3, 'Answer "Use current details?"', 'Choose whether to use your existing business profile details (pre-fills the form) or enter different information for the website.')
  d.step(4, 'Upload your logo and photos', 'Upload your company logo and up to 5 business photos that you want featured on the website.')
  d.step(5, 'Select your style preferences', 'Choose a design style (Modern, Classic, Bold, or Minimal), preferred colors, budget range, and desired timeline.')
  d.step(6, 'Submit', 'Your interest form is submitted securely. The XpertAISolution.com team will reach out within 24 hours.')

  // ── Section 12 ─────────────────────────────────────────────────────────────
  d.newPage()
  d.h1('12. Upgrading Your Plan')
  d.p('TTC offers three plan tiers. You can upgrade at any time from within the app.')

  d.featureTable([
    ['Feature',                          'Free',  'Pro',   'Enterprise'],
    ['Estimates per month',              '3',     'Unlimited', 'Unlimited'],
    ['PDF Export',                       '✓',     '✓',     '✓'],
    ['Word Export (.docx)',              '—',     '✓',     '✓'],
    ['3-Tier pricing',                   '✓',     '✓',     '✓'],
    ['Auto-populate formulas (18 types)','✓',     '✓',     '✓'],
    ['Company Settings & Logo',          '✓',     '✓',     '✓'],
    ['Convert Estimate to Invoice',      '✓',     '✓',     '✓'],
    ['CRM — Client Management',          '—',     '✓',     '✓'],
    ['CRM — Notes & Timeline',           '—',     '✓',     '✓'],
    ['Estimate History in CRM',          '—',     '✓',     '✓'],
    ['Team Members',                     '—',     '—',     '✓'],
    ['Priority Support',                 '—',     '—',     '✓'],
    ['Admin Command Center',             '—',     '—',     '✓'],
  ])

  d.kv('Free Plan', '$0/month — Up to 3 estimates')
  d.kv('Pro Plan',  '$29/month — Unlimited estimates + full CRM')
  d.kv('Enterprise', '$79/month — Everything + team members + priority support')

  d.callout('tip', 'To upgrade, sign in and look for the "Upgrade" prompt in the app, or contact support at support@xpertaisolution.com.')

  // ── Section 13 ─────────────────────────────────────────────────────────────
  d.h1('13. Getting Help')
  d.p('If you have questions not covered in this guide, here are your support options:')
  d.bullets([
    'Email Support — support@xpertaisolution.com (all plans)',
    'Priority Email — Faster response times for Enterprise plan users',
    'Website — xpertaisolution.com for the latest updates and announcements',
    'Admin note: If you did not receive this guide via email, log in and use the "Resend Guide" button in your account settings, or contact support.',
  ])
  d.callout('info', 'TTC Estimator is actively developed. New project types, features, and integrations are added regularly. Watch for in-app notifications for new updates.')

  d.save('getting-started.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE 2: PRO PLAN
// ═══════════════════════════════════════════════════════════════════════════════
function generateProGuide() {
  const d = new Doc()

  d.cover(
    'Pro Plan Guide',
    'Everything included with your Pro subscription — unlimited estimates, full CRM, Word export, and more.',
    C.indigoMid,
    '★  Pro Plan  ★  $29/month'
  )

  d.h1('Table of Contents')
  d.tocEntry('1. Welcome to Pro', 2)
  d.tocEntry('2. What\'s Included at a Glance', 2)
  d.tocEntry('3. Unlimited Estimates', 3)
  d.tocEntry('4. Word Export (.docx)', 3)
  d.tocEntry('5. Full CRM — Client Management', 4)
  d.tocEntry('Adding & Managing Clients', 4, 1)
  d.tocEntry('Pipeline Statuses', 4, 1)
  d.tocEntry('Client Notes & History', 5, 1)
  d.tocEntry('Estimate History per Client', 5, 1)
  d.tocEntry('Search & Filter', 5, 1)
  d.tocEntry('6. Advanced Estimate Settings', 6)
  d.tocEntry('7. Managing Your Subscription', 6)
  d.tocEntry('8. Summary: Free Plan Included', 7)
  d.tocEntry('9. Upgrading to Enterprise', 7)
  d.tocEntry('10. Support', 8)

  d.newPage()
  d.h1('1. Welcome to Pro')
  d.p('Congratulations on your Pro subscription! You now have access to the full power of TTC Estimator. This guide covers every Pro-exclusive feature in detail, plus a summary of everything included in the Free plan that you continue to have access to.')
  d.callout('feature', 'Pro Plan: $29/month · Unlimited estimates · Full CRM · Word export · Advanced settings · Email support')

  d.h1('2. What\'s Included at a Glance')
  d.featureTable([
    ['Capability',                        'Free',     'Pro (You)'],
    ['Estimates',                         '3 total',  'Unlimited'],
    ['PDF Export',                        '✓',        '✓'],
    ['Word Export (.docx)',               '—',        '✓'],
    ['3-Tier Pricing',                    '✓',        '✓'],
    ['18 Project Type Formulas',          '✓',        '✓'],
    ['Company Settings & Logo',           '✓',        '✓'],
    ['Convert Estimate → Invoice',        '✓',        '✓'],
    ['CRM — Full Client Management',      '—',        '✓'],
    ['CRM — Notes & Activity Timeline',   '—',        '✓'],
    ['CRM — Estimate History per Client', '—',        '✓'],
    ['Advanced Financial Settings',       '✓',        '✓'],
    ['Email Support',                     'Standard', 'Standard'],
    ['Priority Support',                  '—',        '—'],
  ])

  d.h1('3. Unlimited Estimates')
  d.p('With Pro, the 3-estimate limit of the Free plan is completely removed. You can create, save, and manage as many estimates as you need — whether that\'s 10 a month or 200.')

  d.h2('What This Means for Your Workflow')
  d.bullets([
    'Create estimates for every inquiry — even if you know only 10% will close.',
    'Maintain a full history of every bid you have ever submitted.',
    'Reopen and update old estimates when a client comes back months later.',
    'Duplicate similar estimates as starting points for new projects.',
    'Track win/loss rates by reviewing accepted vs. declined estimates over time.',
  ])
  d.callout('tip', 'Best practice: Create an estimate immediately after a site visit while measurements and details are fresh. Even rough estimates are valuable for tracking your pipeline.')

  d.h2('Saved Estimates List')
  d.p('Your saved estimates are accessible from the "Saved Estimates" button in the header. The list shows up to 50 most recent estimates. Each row displays:')
  d.bullets([
    'Estimate Number — Auto-generated sequential number (e.g., EST-2024-001)',
    'Client Name — The client for this estimate',
    'Project Type — The trade category selected',
    'Quote Amount — The selected tier\'s total price',
    'Status — Draft, Sent, Accepted, or Declined',
    'Date Created — When the estimate was first saved',
  ])

  d.newPage()
  d.h1('4. Word Export (.docx)')
  d.p('Pro users can export estimates as Microsoft Word documents in addition to PDF. Word export is ideal when you or your client wants to make minor edits to the document before finalizing.')

  d.h2('How to Export as Word')
  d.step(1, 'Complete your estimate', 'Fill in all estimate details as normal.')
  d.step(2, 'Select your view', 'Choose "Contractor View" for the full internal version or "Client Quote View" for the client-facing document.')
  d.step(3, 'Select pricing tier', 'Click the tier radio (Conservative, Standard, Premium) you want reflected.')
  d.step(4, 'Click "Word"', 'The Word button in the Export Bar appears only for Pro users. Clicking it downloads a .docx file instantly.')
  d.step(5, 'Open and edit in Word', 'Open the file in Microsoft Word, Google Docs, or Apple Pages. All formatting — tables, headers, company logo, and contact info — is preserved.')

  d.h2('Word vs. PDF: When to Use Each')
  d.bullets([
    'PDF — Best for final quotes sent to clients. Cannot be easily edited. Looks professional and polished.',
    'Word — Best when you need to add custom contract language, make last-minute edits, or work with a client who requests an editable document.',
  ])
  d.callout('warn', 'When sending a Word document to a client, be aware that they can edit the pricing. For legally binding quotes, PDF is recommended.')

  d.h1('5. Full CRM — Client Management')
  d.p('The CRM is one of the most valuable features of the Pro plan. It transforms TTC from an estimating tool into a complete business management platform.')

  d.h2('Adding & Managing Clients')
  d.p('Access the CRM by clicking the "CRM" tab in the top navigation bar.')
  d.step(1, 'Click "+ New Client"', 'Opens the new client form.')
  d.step(2, 'Enter client details', 'Required: Client Name. Recommended: Email, Phone, Address, and Source (how they found you). Optional: Tags, Company name.')
  d.step(3, 'Set pipeline status', 'Choose the appropriate status: Prospect, Active, Completed, On-Hold, or Declined.')
  d.step(4, 'Save', 'Client is added to your CRM list.')

  d.h2('Pipeline Statuses — Detailed Guide')
  d.bullets([
    'Prospect — New inquiry or potential client. Has not yet received or accepted a quote. Action: Schedule site visit, send estimate.',
    'Active — Client has accepted a quote or has ongoing work. Action: Track project progress, communicate updates.',
    'Completed — All work is done and payment received. Action: Request a review, offer referral incentive, send a thank-you.',
    'On-Hold — Project paused by client or external factors. Action: Follow up every 2–4 weeks to check status.',
    'Declined — Client chose another contractor or cancelled. Action: Note the reason, remove from active pipeline.',
  ])
  d.callout('tip', 'Keeping your pipeline statuses current takes 2 minutes a day and gives you a real-time snapshot of your business health. Make it a daily habit.')

  d.newPage()
  d.h2('Client Notes & Activity Timeline')
  d.p('The notes timeline in each client profile is a powerful record-keeping tool.')
  d.h3('Adding Notes')
  d.bullets([
    'Open a client profile by clicking their name.',
    'Click "Add Note" to open the text input.',
    'Type your note — include dates, names, amounts, and specific details.',
    'Click "Save Note". It appears immediately at the top of the timeline with a timestamp.',
  ])
  d.h3('What to Note')
  d.bullets([
    'Phone call summaries ("Called 6/15, client confirmed start date of 6/22")',
    'Site visit observations ("Property has narrow gate, will need smaller equipment")',
    'Client preferences ("Prefers afternoon calls, uses Benjamin Moore paint only")',
    'Payment tracking ("Deposit of $2,500 received via check #1042 on 6/18")',
    'Change orders ("Client requested addition of deck — new quote sent 6/20")',
    'Complaints or issues ("Neighbor complained about noise — agreed to stop by 6pm")',
  ])

  d.h2('Estimate History per Client')
  d.p('Every estimate you have linked to a client appears in their profile under "Estimate History". This shows:')
  d.bullets([
    'Estimate number and date',
    'Project type and description',
    'Quote amount (selected tier)',
    'Current status (Draft / Sent / Accepted / Declined)',
    'A "Load" button to reopen the full estimate in the Estimator',
  ])
  d.callout('info', 'The Total Value shown on each client card is the cumulative sum of all Accepted estimates for that client. This is your lifetime revenue from that client.')

  d.h2('Search & Filter')
  d.bullets([
    'Search bar — Searches across name, company, email, phone, and notes simultaneously.',
    'Status filter chips — Click any status label at the top of the CRM to show only that group.',
    'Sort options — Click column headers to sort by name (A–Z), date added (newest/oldest), or total value (highest/lowest).',
    'Tag filter — Filter by custom tags you assign to clients (e.g., "Commercial", "HOA", "Referral").',
  ])

  d.h1('6. Advanced Estimate Settings')
  d.p('Pro users have access to per-estimate setting overrides that let you customize margins and terms on a job-by-job basis without changing your global defaults.')
  d.bullets([
    'Per-estimate material markup — Override your default markup for a specific job.',
    'Per-estimate tax rate — Add or remove tax for specific clients or jurisdictions.',
    'Per-estimate validity period — Extend or shorten quote validity for time-sensitive bids.',
    'Custom payment terms — Override your standard payment terms for commercial clients or special arrangements.',
  ])

  d.h1('7. Managing Your Subscription')
  d.h2('Viewing Your Current Plan')
  d.p('Your current plan and billing status are visible to your account admin. Contact support@xpertaisolution.com to manage billing, update payment methods, or request an invoice.')

  d.h2('Cancellation Policy')
  d.p('You may cancel your Pro subscription at any time. Your account reverts to Free plan limits at the end of your current billing period. All your data is retained — you simply lose access to Pro-exclusive features.')
  d.callout('warn', 'If you cancel and your estimate count exceeds 3, existing estimates remain readable but you cannot create new ones until you are under the limit or resubscribe.')

  d.newPage()
  d.h1('8. Summary: Free Plan Included')
  d.p('Everything in the Free plan is also included with your Pro subscription. Here is a quick reference:')
  d.bullets([
    '18 project types with auto-populated formulas (Paint, Concrete, Roofing, Electrical, Plumbing, Fencing, and more)',
    'Smart measurements — Enter measurements once; materials, labor, and overhead calculate automatically',
    'Contractor View — Full cost breakdown with margins, markup, and profit per tier',
    'Client Quote View — Professional, branded client document with 3 pricing options',
    'PDF Export — Download professional PDFs for any estimate',
    'Print — Print directly from the browser',
    'Company Settings — Logo, contact info, default margins, payment terms, warranty',
    'Convert to Invoice — Turn any accepted estimate into an invoice in one click',
    'Auto-save — Estimates save automatically every 30 seconds',
    'Saved Estimates — Browse, load, and manage your full estimate history',
    'Scope of Work & Exclusions — Add detailed scope and exclusions to every estimate',
    'Internal Notes — Private notes on each estimate (never shown to clients)',
  ])

  d.h1('9. Upgrading to Enterprise')
  d.p('The Enterprise plan ($79/month) adds:')
  d.bullets([
    'Team Members — Add employees or subcontractors to your account so they can create estimates under your company profile.',
    'Priority Support — Faster response times via dedicated email.',
    'Admin Command Center — Full visibility and control over all team members, billing, and activity.',
    'Custom onboarding — Personalized setup assistance for larger organizations.',
  ])
  d.callout('tip', 'Enterprise is ideal for companies with more than one estimator, or contractors who want dedicated support and team oversight.')

  d.h1('10. Support')
  d.bullets([
    'Email: support@xpertaisolution.com',
    'Response time: Within 1 business day (Pro plan)',
    'Website: xpertaisolution.com',
  ])
  d.callout('info', 'If you did not receive this guide via email or need it resent, contact support or ask your admin to use the "Resend Guide" feature in the Admin panel.')

  d.save('pro-plan-guide.pdf')
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE 3: ENTERPRISE PLAN
// ═══════════════════════════════════════════════════════════════════════════════
function generateEnterpriseGuide() {
  const d = new Doc()

  d.cover(
    'Enterprise Plan Guide',
    'Everything included with your Enterprise subscription — team accounts, priority support, admin controls, and the full platform.',
    C.purple,
    '◆  Enterprise Plan  ◆  $79/month'
  )

  d.h1('Table of Contents')
  d.tocEntry('1. Welcome to Enterprise', 2)
  d.tocEntry('2. What\'s Included at a Glance', 2)
  d.tocEntry('3. Team Members', 3)
  d.tocEntry('Adding Team Members', 3, 1)
  d.tocEntry('Team Permissions', 3, 1)
  d.tocEntry('Managing the Team', 4, 1)
  d.tocEntry('4. Admin Command Center', 4)
  d.tocEntry('Overview Dashboard', 4, 1)
  d.tocEntry('Users Tab', 5, 1)
  d.tocEntry('Edit User Drawer', 5, 1)
  d.tocEntry('Billing Tab', 5, 1)
  d.tocEntry('Web Leads Tab', 6, 1)
  d.tocEntry('Audit Log Tab', 6, 1)
  d.tocEntry('5. Priority Support', 7)
  d.tocEntry('6. Summary: Pro Plan Included', 7)
  d.tocEntry('7. Summary: Free Plan Included', 8)
  d.tocEntry('8. Billing & Account Management', 9)
  d.tocEntry('9. Contact & Support', 9)

  d.newPage()
  d.h1('1. Welcome to Enterprise')
  d.p('Thank you for choosing the Enterprise plan. You have access to every feature TTC Estimator offers, including powerful admin controls, team member accounts, priority support, and the complete estimating and CRM platform.')
  d.callout('feature', 'Enterprise Plan: $79/month · Everything in Pro · Team Members · Priority Support · Admin Command Center · Full audit trail')

  d.h1('2. What\'s Included at a Glance')
  d.featureTable([
    ['Capability',                          'Free',     'Pro',      'Enterprise (You)'],
    ['Estimates',                           '3 total',  'Unlimited','Unlimited'],
    ['PDF Export',                          '✓',        '✓',        '✓'],
    ['Word Export',                         '—',        '✓',        '✓'],
    ['3-Tier Pricing',                      '✓',        '✓',        '✓'],
    ['18 Project Type Formulas',            '✓',        '✓',        '✓'],
    ['Full CRM',                            '—',        '✓',        '✓'],
    ['Convert Estimate → Invoice',          '✓',        '✓',        '✓'],
    ['Team Member Accounts',                '—',        '—',        '✓'],
    ['Admin Command Center',                '—',        '—',        '✓'],
    ['User Management (edit plan/role)',     '—',        '—',        '✓'],
    ['Billing Overview & MRR',              '—',        '—',        '✓'],
    ['Web Leads Dashboard',                 '—',        '—',        '✓'],
    ['Full Audit Log',                      '—',        '—',        '✓'],
    ['Priority Email Support',              '—',        '—',        '✓'],
  ])

  d.h1('3. Team Members')
  d.p('The Enterprise plan allows you to add additional users to your organization. Each team member gets their own login and private workspace under your account umbrella.')

  d.h2('Adding Team Members')
  d.step(1, 'Go to Admin Command Center', 'Click the "Admin" tab in the top navigation bar (visible only to admin accounts).')
  d.step(2, 'Open the Users Tab', 'Click the "Users" tab in the Admin Command Center.')
  d.step(3, 'Find or invite the team member', 'Team members must first create their own Free account using their work email. Once they have signed up, you can find them in the Users list.')
  d.step(4, 'Click the Edit (pencil) icon', 'Click the pencil icon on the team member\'s row to open the Edit User drawer.')
  d.step(5, 'Set plan to Pro or Enterprise', 'Use the Plan selector to grant them full access.')
  d.step(6, 'Set role', 'Choose "User" for standard team members or "Admin" for managers who need access to the Admin Command Center.')
  d.step(7, 'Save changes', 'Click "Save Changes". The team member\'s account is instantly upgraded.')
  d.callout('info', 'Team members have their own private workspaces. Their clients, estimates, and notes are separate from yours unless you choose to share access.')

  d.h2('Team Permissions')
  d.bullets([
    'User role — Access to Estimator and CRM only. Cannot see the Admin Command Center. Full isolation from other users\' data.',
    'Admin role — Full access including Admin Command Center. Can edit any user\'s plan, role, and subscription status. Can view all Web Leads. Can see the Audit Log.',
  ])
  d.callout('warn', 'Only grant Admin role to trusted managers. Admin users can view and modify all accounts in your organization, including billing-related information.')

  d.newPage()
  d.h2('Managing the Team')
  d.p('You can manage all team members from the Admin Command Center → Users tab at any time:')
  d.bullets([
    'Suspend a user — Click the Ban (🚫) icon to immediately block a user from signing in. Use for departing employees.',
    'Reinstate a user — Click the checkmark icon to restore access to a suspended user.',
    'Reset password — Click the rotate arrow icon to send a password reset email to any user.',
    'Edit plan/role — Use the pencil (edit) icon to change any user\'s plan, role, subscription status, or onboarding state.',
  ])

  d.h1('4. Admin Command Center')
  d.p('The Admin Command Center is your central management dashboard. Access it by clicking "Admin" in the top navigation bar.')

  d.h2('Overview Dashboard')
  d.p('The Overview tab shows a real-time snapshot of your organization:')
  d.bullets([
    'Total Users — Total number of registered accounts.',
    'New This Month — Users who signed up in the current calendar month.',
    'Active Plans — Number of paid (active) subscriptions.',
    'Estimated MRR — Monthly Recurring Revenue calculation based on current plan distribution.',
    'Users by Plan chart — Visual breakdown of Free vs. Pro vs. Enterprise users with percentage bars.',
    'Subscription Statuses chart — Breakdown by billing status: Active, Trialing, Past Due, Canceled, Inactive.',
  ])
  d.callout('tip', 'Review the Overview tab weekly to monitor growth trends, identify at-risk accounts (Past Due), and track your revenue trajectory.')

  d.h2('Users Tab')
  d.p('The Users tab shows every registered user with full details:')
  d.bullets([
    'Avatar — Initial letter of the user\'s email address',
    'Name / Email — Display name (from profile) and email address',
    'Plan badge — Color-coded plan: Gray (Free), Blue (Pro), Purple (Enterprise)',
    'Status badge — Subscription status: Active (green), Trial (blue), Past Due (yellow), Canceled (red), Inactive (gray)',
    'Joined date — When the account was created',
    'Last sign-in — Most recent login date',
    'Actions — Pencil (edit), Reset Password, Suspend/Reinstate, Stripe link (if applicable)',
  ])
  d.p('Use the search bar to find users by name, email, or company. Use the "All Plans" dropdown to filter by plan tier.')

  d.h2('Edit User Drawer')
  d.p('Click the pencil icon on any user to open the Edit User drawer — a right-side panel with controls to instantly change:')
  d.bullets([
    'Plan — Free, Pro, or Enterprise (color-coded toggle buttons)',
    'Role — User or Admin (blue/red toggle)',
    'Subscription Status — Active, Trialing, Past Due, Canceled, or Inactive dropdown',
    'Onboarding Complete — Toggle switch. Turn off to force the user through the setup wizard again on their next login.',
  ])
  d.step(1, 'Make your changes', 'Click the desired plan, role, or status. Changes are highlighted immediately in the drawer.')
  d.step(2, 'Click "Save Changes"', 'All changes are applied instantly and logged to the Audit Log.')
  d.callout('info', 'Every change made in the Edit User drawer is recorded in the Audit Log with a timestamp, the admin who made the change, and what was changed.')

  d.newPage()
  d.h2('Billing Tab')
  d.p('The Billing tab provides a financial overview focused on paid subscriptions:')
  d.bullets([
    'Est. MRR — Your estimated monthly recurring revenue (Pro × $29 + Enterprise × $79).',
    'Active Subscriptions — Count of currently active paying subscribers.',
    'Trialing — Users on a trial period.',
    'Past Due — Users whose payment has failed. These users may lose access soon — follow up.',
    'Paying Users table — Lists all Pro and Enterprise users with their plan, status, MRR contribution, and a link to their Stripe customer profile (if Stripe is connected).',
  ])
  d.callout('warn', 'Monitor the "Past Due" count closely. A high past-due count indicates payment processing issues that should be addressed to maintain revenue.')

  d.h2('Web Leads Tab')
  d.p('The Web Leads tab captures all submissions from the "Need a Website?" interest form in the app. This is a built-in lead generation tool for XpertAISolution.com web design services.')
  d.p('Each lead card shows:')
  d.bullets([
    'Business Name — The business requesting a website',
    'Contact info — Email and phone from the submission',
    'Submitted date — When the form was submitted',
    'Status badge — New (blue), Contacted (yellow), In Progress (purple), Completed (green), Declined (red)',
    'Status dropdown — Change the lead status directly from the card',
    'Expand arrow — Click to reveal full lead details',
  ])
  d.p('Expanded lead details include:')
  d.bullets([
    'Full contact information (name, email, phone, address)',
    'Website preferences (style, colors, budget range, timeline)',
    'Special details / notes from the client',
    'Links to uploaded logo and business photos',
    'Whether the user used their existing profile details or entered custom info',
    'Unique lead ID for reference',
  ])
  d.callout('tip', 'A red badge on the "Web Leads" tab shows the count of new, unreviewed leads. Check this daily to follow up promptly — fast response dramatically improves conversion rates.')

  d.h2('Audit Log Tab')
  d.p('The Audit Log records every privileged admin action permanently. It cannot be edited or deleted.')
  d.p('Each entry shows:')
  d.bullets([
    'Timestamp — Exact date and time of the action',
    'Admin — Email of the admin who performed the action',
    'Action — What was done (e.g., "update_user", "toggle_ban", "reset_password")',
    'Target — The user account that was affected',
  ])
  d.p('Actions logged include:')
  d.bullets([
    'list_users — Admin viewed the user list',
    'update_user — Admin changed a user\'s plan, role, status, or onboarding',
    'toggle_ban — Admin suspended or reinstated a user',
    'reset_password — Admin sent a password reset email',
  ])
  d.callout('info', 'The Audit Log is essential for compliance, accountability, and investigating any disputes about account changes. Share it with your organization\'s compliance team if required.')

  d.newPage()
  d.h1('5. Priority Support')
  d.p('As an Enterprise subscriber, you receive priority email support with faster response times than standard plan users.')
  d.bullets([
    'Priority Email — support@xpertaisolution.com (mark subject "ENTERPRISE PRIORITY")',
    'Response time — Within 4 business hours (vs. 1 business day for Pro)',
    'Custom onboarding — Request a personalized setup call for your team',
    'Feature requests — Enterprise customers\' feature requests are given priority consideration in the product roadmap',
  ])

  d.h1('6. Summary: Pro Plan Included')
  d.p('Everything in the Pro plan is included with your Enterprise subscription:')
  d.bullets([
    'Unlimited estimates — No cap on estimate creation, saving, or history',
    'Word Export (.docx) — Download any estimate as an editable Word document',
    'Full CRM — Client management, pipeline tracking, notes, history, search, and filter',
    'Advanced per-estimate settings — Override margins, tax, and terms per job',
    'Estimate to Invoice conversion — One-click invoice from any accepted estimate',
  ])

  d.h1('7. Summary: Free Plan Included')
  d.p('Everything in the Free plan is also included:')
  d.bullets([
    '18 project types — Painting, Concrete, Roofing, Electrical, Plumbing, Fencing, Landscaping, HVAC, Flooring, Drywall, Masonry, Carpentry, Tile & Stone, Insulation, Siding, Windows & Doors, General Contracting, Custom',
    'Auto-populate formulas — Smart measurement-to-cost calculations with industry-standard waste factors',
    'Contractor View — Full internal cost breakdown with margin analysis',
    'Client Quote View — Professional branded quote with 3 pricing tiers',
    'PDF Export — Professional download for any estimate',
    'Print — Browser print with hidden navigation/internal tools',
    'Company Settings — Full control over branding, defaults, and document settings',
    'Auto-save — Every 30 seconds, locally and in cloud',
    'Scope of Work & Exclusions — Detailed scope definition on every estimate',
    'Internal Notes — Private per-estimate notes never shown to clients',
  ])

  d.h1('8. Billing & Account Management')
  d.h2('Billing Cycle')
  d.p('Enterprise subscriptions are billed monthly on the anniversary of your signup date. You will receive an invoice email each billing cycle.')

  d.h2('Changing Plans')
  d.p('To downgrade to Pro or Free, or to make changes to your billing, contact support@xpertaisolution.com. Downgrades take effect at the end of your current billing period.')

  d.h2('Cancellation')
  d.p('You may cancel at any time. Your account and all your data (estimates, clients, notes) remain accessible and are retained. You lose access to Enterprise-exclusive features at the end of the billing period.')

  d.h1('9. Contact & Support')
  d.bullets([
    'Priority Email: support@xpertaisolution.com (include "ENTERPRISE PRIORITY" in subject)',
    'Response: Within 4 business hours',
    'Website: xpertaisolution.com',
    'General inquiries: rmartin@xpertaisolution.com',
  ])
  d.callout('feature', 'Thank you for choosing TTC Enterprise. Your subscription directly supports the continued development of new features, project types, and integrations. We appreciate your trust in our platform.')

  d.save('enterprise-plan-guide.pdf')
}

// ─── Run ──────────────────────────────────────────────────────────────────────
console.log('\n🔧 TTC Estimator — Generating PDF Guides...\n')
generateGettingStarted()
generateProGuide()
generateEnterpriseGuide()
console.log('\n✅ All guides generated successfully!\n')

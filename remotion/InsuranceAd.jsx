import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from 'remotion';

const NAVY  = '#0b1f3a';
const NAVY2 = '#163560';
const GOLD  = '#c9a84c';
const GOLD2 = '#e8c76b';
const WHITE = '#ffffff';

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function fade(frame, start, end) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut,
  });
}

function slideY(frame, start, end, from = 50) {
  return interpolate(frame, [start, end], [from, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut,
  });
}

export function InsuranceAd({
  hook      = 'Is Your Family Protected?',
  body      = 'Most families are one accident away from financial hardship. Life insurance changes that.',
  cta       = 'Get Your Free Quote Today',
  brandName = 'Xpert Life Solutions',
  tagline   = 'Protecting Families. Building Legacies.',
}) {
  const f = useCurrentFrame();

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY2} 100%)`,
      fontFamily: 'Arial Black, Arial, sans-serif',
      overflow: 'hidden',
    }}>

      {/* Top gold accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 10,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD2}, ${GOLD})`,
        opacity: fade(f, 0, 12),
      }} />

      {/* Brand name */}
      <div style={{
        position: 'absolute', top: 90, left: 0, right: 0, textAlign: 'center',
        opacity: fade(f, 8, 30),
        transform: `translateY(${slideY(f, 8, 30, -24)}px)`,
      }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: GOLD, letterSpacing: 1.5 }}>
          {brandName}
        </div>
        <div style={{
          fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 8,
          fontWeight: 400, letterSpacing: 3, textTransform: 'uppercase',
        }}>
          {tagline}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        position: 'absolute', top: 220, left: 80, right: 80, height: 1.5,
        background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        opacity: fade(f, 28, 45),
      }} />

      {/* Hook */}
      <div style={{
        position: 'absolute', top: '30%', left: 60, right: 60,
        opacity: fade(f, 35, 65),
        transform: `translateY(${slideY(f, 35, 65, 60)}px)`,
      }}>
        <div style={{
          fontSize: 68, fontWeight: 900, color: WHITE, lineHeight: 1.15,
          textAlign: 'center', textShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {hook}
        </div>
      </div>

      {/* Gold dot separator */}
      <div style={{
        position: 'absolute', top: '54%', left: '50%',
        transform: 'translateX(-50%)',
        width: 10, height: 10, borderRadius: '50%', background: GOLD,
        opacity: fade(f, 75, 90),
      }} />

      {/* Body */}
      <div style={{
        position: 'absolute', top: '57%', left: 60, right: 60,
        opacity: fade(f, 80, 110),
        transform: `translateY(${slideY(f, 80, 110, 40)}px)`,
      }}>
        <div style={{
          fontSize: 32, color: 'rgba(255,255,255,0.82)', textAlign: 'center',
          lineHeight: 1.55, fontWeight: 400,
        }}>
          {body}
        </div>
      </div>

      {/* CTA button */}
      <div style={{
        position: 'absolute', bottom: 180, left: 60, right: 60,
        opacity: fade(f, 120, 150),
        transform: `translateY(${slideY(f, 120, 150, 30)}px)`,
      }}>
        <div style={{
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
          borderRadius: 60, padding: '24px 40px',
          textAlign: 'center', fontSize: 30, fontWeight: 900,
          color: NAVY, letterSpacing: 0.5,
          boxShadow: '0 8px 32px rgba(201,168,76,0.45)',
        }}>
          {cta}
        </div>
      </div>

      {/* Bottom gold accent bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 10,
        background: `linear-gradient(90deg, ${GOLD}, ${GOLD2}, ${GOLD})`,
        opacity: fade(f, 0, 12),
      }} />

    </AbsoluteFill>
  );
}

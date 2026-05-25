import React from 'react';
import { Composition } from 'remotion';
import { InsuranceAd } from './InsuranceAd.jsx';

export const RemotionRoot = () => (
  <Composition
    id="InsuranceAd"
    component={InsuranceAd}
    durationInFrames={210}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      hook:      'Is Your Family Protected?',
      body:      'Most families are one accident away from financial hardship. Life insurance changes that.',
      cta:       'Get Your Free Quote Today',
      brandName: 'Xpert Life Solutions',
      tagline:   'Protecting Families. Building Legacies.',
    }}
  />
);

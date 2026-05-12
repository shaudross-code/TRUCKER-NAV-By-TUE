// Lightweight 9-step in-app walkthrough for newly-shipped features.
// Triggered from the "What's new →" CTA on the announcement toast.
//
// Each step targets a real DOM element by data-testid. The Walkthrough
// component highlights the target with a glowing outline + bottom-anchored
// popover; clicking "Next" advances to the next step (and optionally
// switches views via setActiveView).
import { ViewType } from '../types';

export interface WalkthroughStep {
  /** data-testid of the element to highlight */
  testId: string;
  /** Which view to navigate to before the step is shown */
  view: ViewType;
  /** Bold title for the step's popover */
  title: string;
  /** One-paragraph description shown under the title */
  body: string;
  /** Friendly "X of Y" category tag */
  tag?: string;
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    testId: 'pay-cash-advance-card',
    view: ViewType.PAY_SUMMARY,
    title: 'Cash Advance',
    body: 'Log any cash advances you took this week — they\'re automatically deducted from your gross pay.',
    tag: 'Money',
  },
  {
    testId: 'pay-maintenance-fee-card',
    view: ViewType.PAY_SUMMARY,
    title: 'Maintenance Fee — Auto-Accrual',
    body: 'Every mile you drive contributes a configurable ¢/mile rate to your Maintenance Account. Tap to change the rate.',
    tag: 'Money',
  },
  {
    testId: 'pay-maintenance-ledger-card',
    view: ViewType.PAY_SUMMARY,
    title: 'Maintenance Ledger',
    body: 'Audit every cent — accrual, deposit, withdrawal, and reset are all logged with date, miles, and balance.',
    tag: 'Money',
  },
  {
    testId: 'pay-escrow-card',
    view: ViewType.PAY_SUMMARY,
    title: 'Smart Escrow (3% Auto-Track)',
    body: 'Each week, 3% of your gross auto-deposits to escrow up to a configurable cap. Updates both up and down with your gross.',
    tag: 'Money',
  },
  {
    testId: 'pay-net-breakdown-toggle',
    view: ViewType.PAY_SUMMARY,
    title: 'Net Pay Breakdown',
    body: 'Tap the info icon next to Net Pay to see line-by-line math — every fee, every deduction, your exact take-home.',
    tag: 'Money',
  },
  {
    testId: 'pay-def-card',
    view: ViewType.PAY_SUMMARY,
    title: 'New: DEF Tracking',
    body: 'Diesel Exhaust Fluid purchases are now tracked separately and deducted from your gross — accurate to the penny.',
    tag: 'Money',
  },
  {
    testId: 'corridor-view-btn',
    view: ViewType.NAVIGATION,
    title: 'Route Corridor View',
    body: 'When a route is active, this green Route button fits the entire trip + a 5-mile buffer so every POI along the way is visible at once.',
    tag: 'Navigation',
  },
  {
    testId: 'roads-highlight-btn',
    view: ViewType.NAVIGATION,
    title: 'Glowing Roads & Highways',
    body: 'Toggle a neon-green tile layer that highlights motorways/trunks/primary roads under your route — the corridor pops on satellite imagery.',
    tag: 'Navigation',
  },
  {
    testId: 'night-mode-btn',
    view: ViewType.NAVIGATION,
    title: 'Night Mode Auto-Dimming',
    body: 'Map and HUD dim automatically at local sunset — you\'re never blinded at night and never squinting in daylight.',
    tag: 'Driver UX',
  },
];

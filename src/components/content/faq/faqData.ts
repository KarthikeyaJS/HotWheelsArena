/**
 * FAQ content (pure data). Values that the pit crew can change in Firestore (shipping threshold,
 * fee, COD, per-car limit) are passed in, so answers always match `settings/site`.
 */
import { BRAND_NAME, BRAND_PRODUCT_LINE, SUPPORT_EMAIL, SUPPORT_HOURS } from '@/config/brand';
import { BADGES, ORDER_BASE_XP, RARITY_XP_BONUS, XP_PER_CAR } from '@/config/gamification';
import { ROUTES, garagePath } from '@/config/routes';
import { formatINR } from '@/lib/format';

export interface FaqLink {
  label: string;
  to: string;
}

export interface FaqEntry {
  /** Anchor id (`/faq#faq-delivery-time`). Unique across all groups. */
  id: string;
  question: string;
  /** Answer paragraphs. */
  answer: readonly string[];
  /** Related pages shown under the answer. */
  links?: readonly FaqLink[];
}

export interface FaqGroup {
  /** Anchor id of the group section (`/faq#payments`). */
  id: string;
  title: string;
  description: string;
  items: readonly FaqEntry[];
}

export interface FaqContext {
  shippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  maxQtyPerItem: number;
}

const badgeList = BADGES.map(
  (badge) => `${badge.title} (${badge.requirement.toLowerCase()}, +${badge.xpReward} XP)`,
).join('; ');

/** All FAQ groups in display order. */
export function buildFaqGroups(context: FaqContext): FaqGroup[] {
  const threshold = formatINR(context.shippingThreshold);
  const fee = formatINR(context.shippingFee);
  const methods = context.codEnabled ? 'card, UPI and cash on delivery' : 'card and UPI';

  return [
    {
      id: 'orders-shipping',
      title: 'Orders & Shipping',
      description: 'Dispatch, delivery windows, damaged parcels and the vault.',
      items: [
        {
          id: 'faq-delivery-time',
          question: 'How long does delivery take?',
          answer: [
            'Orders leave our garage within 1–2 business days. Delivery then takes 3–7 business days to most PIN codes across India.',
            'Remote PIN codes — parts of the North-East, Jammu & Kashmir, Ladakh, the Andaman & Nicobar Islands and Lakshadweep — can take a few extra days.',
          ],
          links: [{ label: 'Shipping & Returns', to: ROUTES.shippingReturns }],
        },
        {
          id: 'faq-shipping-cost',
          question: 'Is shipping free?',
          answer: [
            `Shipping is free on every order of ${threshold} or more. Below that, a flat ${fee} shipping fee is added at checkout — your pit stop shows exactly how far you are from free shipping.`,
          ],
          links: [{ label: 'Your pit stop', to: ROUTES.cart }],
        },
        {
          id: 'faq-order-status',
          question: 'Where can I see my orders?',
          answer: [
            'Sign in and open Orders. Every order shows its status as it moves from placed → processing → shipped → delivered, along with the items, address and payment details.',
          ],
          links: [{ label: 'My orders', to: ROUTES.orders }],
        },
        {
          id: 'faq-damaged-item',
          question: 'My car arrived damaged or I received the wrong one. What now?',
          answer: [
            'Sorry about that — we will make it right. Report it within 7 days of delivery and include an unedited unboxing video that shows the sealed parcel being opened.',
            `Email ${SUPPORT_EMAIL} with your order reference (${SUPPORT_HOURS}). We replace the car when stock allows, otherwise we refund it in full.`,
          ],
          links: [
            { label: 'Returns policy', to: `${ROUTES.shippingReturns}#returns` },
            { label: 'Contact the pit crew', to: ROUTES.contact },
          ],
        },
        {
          id: 'faq-quantity-limit',
          question: 'Is there a limit per collector?',
          answer: [
            `Yes — up to ${context.maxQtyPerItem} of each car per order, and never more than we have in stock. It keeps scalpers out and gives more collectors a fair shot, especially at numbered editions.`,
          ],
        },
        {
          id: 'faq-limited-editions',
          question: 'How do the vault’s limited editions work?',
          answer: [
            'Vault cars are numbered runs: #001/500 means edition number 1 of a 500-piece run. Each listing shows how many cars of that run are left.',
            'Remaining counts are updated by our pit crew and shown as static numbers — they do not tick down live, and a car is only yours once your order is confirmed. Once a run is gone, it is gone.',
          ],
          links: [{ label: 'The Vault', to: ROUTES.vault }],
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payments — test mode',
      description: 'How the simulated checkout works and what it means for you.',
      items: [
        {
          id: 'faq-test-mode',
          question: 'Are payments real?',
          answer: [
            `No. ${BRAND_NAME} currently runs its checkout in test mode. Payments are simulated: no money is charged, no card or UPI details are collected, and a TEST MODE banner is shown on every checkout step.`,
            'Orders placed in test mode are demonstration orders. They appear in your order history and earn XP, but nothing is dispatched.',
          ],
          links: [{ label: 'Terms of use', to: `${ROUTES.terms}#test-mode` }],
        },
        {
          id: 'faq-payment-methods',
          question: 'Which payment methods can I choose?',
          answer: [
            `Checkout offers ${methods}. In test mode every option is simulated — choosing one does not contact a bank or payment app.`,
          ],
        },
        {
          id: 'faq-payment-failed',
          question: 'Why did my test payment fail?',
          answer: [
            'The payment simulator declines roughly one in ten card and UPI payments on purpose, so the failure flow can be experienced safely. Nothing was charged and your pit stop is untouched — simply try again.',
          ],
        },
        {
          id: 'faq-prices-changed',
          question: 'Checkout says prices changed. Why?',
          answer: [
            'Totals are always re-checked on our server against the latest prices and stock. If a price or availability changed after you added a car to your pit stop, the order is paused so you can review the updated total before trying again.',
          ],
          links: [{ label: 'Review your pit stop', to: ROUTES.cart }],
        },
        {
          id: 'faq-gst',
          question: 'Do prices include GST?',
          answer: [
            'Yes. Every price is in Indian rupees (INR) and already includes GST. The GST portion is shown as an informational line in your pit stop and at checkout — it is never added on top.',
          ],
        },
      ],
    },
    {
      id: 'garage-xp',
      title: 'My Garage & XP',
      description: 'Your virtual collection, collector levels and badges.',
      items: [
        {
          id: 'faq-my-garage',
          question: 'What is My Garage?',
          answer: [
            `My Garage is your virtual ${BRAND_PRODUCT_LINE} collection. Cars you buy here are parked automatically, and you can add cars you already own from any product page with ADD TO GARAGE.`,
            'Mark favourites, track duplicates, see the total value of your collection and which cars you are still missing from each series.',
          ],
          links: [{ label: 'Open My Garage', to: garagePath() }],
        },
        {
          id: 'faq-earn-xp',
          question: 'How do I earn XP and level up?',
          answer: [
            `Every order earns ${ORDER_BASE_XP} XP plus ${XP_PER_CAR} XP per car, with a rarity bonus per car: rare +${RARITY_XP_BONUS.rare}, super rare +${RARITY_XP_BONUS['super-rare']} and limited +${RARITY_XP_BONUS.limited}. Unlocking a badge adds its own bonus XP.`,
            'XP is calculated on our server when an order is placed or a garage milestone is reached, and your level rises automatically as it grows.',
          ],
          links: [{ label: 'How collector levels work', to: `${ROUTES.about}#levels` }],
        },
        {
          id: 'faq-badges',
          question: 'Which badges can I unlock?',
          answer: [`There are ${BADGES.length} badges to chase: ${badgeList}.`],
          links: [{ label: 'My achievements', to: garagePath('achievements') }],
        },
        {
          id: 'faq-complete-series',
          question: 'How do I complete a series?',
          answer: [
            'Park every car of a series in your garage — bought here or added manually. Each series page shows your progress and lists the cars you are still missing. Completing your first series unlocks MASTER COLLECTOR.',
          ],
          links: [{ label: 'Browse collections', to: ROUTES.collections }],
        },
        {
          id: 'faq-xp-value',
          question: 'Can I redeem XP or badges for discounts?',
          answer: [
            'Not at the moment. XP, levels and badges are bragging rights with no cash value. If that ever changes, it will be announced here first.',
          ],
        },
      ],
    },
    {
      id: 'account-privacy',
      title: 'Account & Privacy',
      description: 'Signing in, your data and how to get it removed.',
      items: [
        {
          id: 'faq-sign-in',
          question: 'How do I sign in?',
          answer: [
            'With your Google account — it is the only sign-in option, so we never see or store a password. Browsing and filling your pit stop work without an account; checkout, orders and My Garage need you to sign in.',
          ],
        },
        {
          id: 'faq-data-stored',
          question: 'What data do you store about me?',
          answer: [
            'Your Google profile basics (name, email and photo), your orders, the addresses you save, your garage and wishlist, and your email if you sign up for drop alerts. We never sell your data.',
          ],
          links: [{ label: 'Privacy policy', to: ROUTES.privacy }],
        },
        {
          id: 'faq-delete-account',
          question: 'Can I delete my account and data?',
          answer: [
            `Yes. Email ${SUPPORT_EMAIL} from the address on your account and we will erase your personal data, except records we must keep by law (such as invoices). You can also ask for a copy or a correction — those are your rights under India’s Digital Personal Data Protection Act, 2023.`,
          ],
          links: [{ label: 'Your privacy rights', to: `${ROUTES.privacy}#your-rights` }],
        },
        {
          id: 'faq-drop-alerts',
          question: 'How do I stop drop alerts?',
          answer: [
            `Email ${SUPPORT_EMAIL} from the subscribed address and we will remove it from the list. Drop alerts are only ever about new castings, vault drops and restocks.`,
          ],
        },
        {
          id: 'faq-cookies',
          question: 'Do you use tracking cookies?',
          answer: [
            'No advertising or tracking cookies. Your browser storage keeps only your pit stop (cart) and display preferences such as theme and engine sounds, plus the session that keeps you signed in.',
          ],
          links: [{ label: 'Cookies & storage', to: `${ROUTES.privacy}#cookies` }],
        },
      ],
    },
  ];
}

/** DOM id of an FAQ item's disclosure button. */
export const faqTriggerId = (id: string): string => `${id}-trigger`;
/** DOM id of an FAQ item's answer panel. */
export const faqPanelId = (id: string): string => `${id}-panel`;

/** Every FAQ entry id (for deep-link validation). */
export function faqEntryIds(groups: readonly FaqGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.items.map((item) => item.id)));
}

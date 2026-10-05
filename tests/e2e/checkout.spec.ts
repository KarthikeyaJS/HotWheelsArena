/**
 * (h) Checkout end to end against the emulators (deterministic test payments):
 * add 2 cars → /cart (lines, totals, free-shipping indicator) → START ENGINE → address
 * validation errors (bad phone / PIN) → valid address → payment (COD / card) → review →
 * place order → success (order id, XP earned, FIRST RIDE badge, no celebration modal on top)
 * → /orders lists it → /orders/<id> detail → /garage shows the cars as PURCHASED.
 */
import type { Page } from '@playwright/test';
import {
  addProductToCart,
  cartButton,
  expect,
  gotoRoute,
  signIn,
  test,
  uniqueEmail,
} from './fixtures';

interface Car {
  slug: string;
  name: string;
  price: number;
}

interface Scenario {
  method: 'cod' | 'card';
  methodLabel: RegExp;
  methodText: RegExp;
  cars: [Car, Car];
  /** Shipping fee expected for this cart (₹0 when over the ₹999 threshold). */
  shipping: number;
}

const inr = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
    .format(amount)
    .replace(/\s/g, ' ');

/** Matches a rupee amount however the browser spaces it (₹1,098 / ₹ 1,098). */
const inrPattern = (amount: number): RegExp => new RegExp(inr(amount).replace('₹', '₹\\s?'));

const SCENARIOS: readonly Scenario[] = [
  {
    method: 'cod',
    methodLabel: /^Cash on Delivery/,
    methodText: /cash on delivery/i,
    cars: [
      { slug: 'monsoon-mauler', name: 'Monsoon Mauler', price: 199 },
      { slug: 'mahindra-thar', name: 'Mahindra Thar', price: 229 },
    ],
    shipping: 79,
  },
  {
    method: 'card',
    methodLabel: /^Card/,
    methodText: /card/i,
    cars: [
      { slug: 'porsche-911-gt3-rs', name: 'Porsche 911 GT3 RS', price: 499 },
      { slug: 'nissan-gt-r-nismo', name: 'Nissan GT-R Nismo', price: 599 },
    ],
    shipping: 0,
  },
];

async function fillAddress(page: Page, phone: string, pincode: string): Promise<void> {
  await page.getByRole('textbox', { name: /^Full name/ }).fill('Arjun Racer');
  await page.getByRole('textbox', { name: /^Mobile number/ }).fill(phone);
  await page
    .getByRole('textbox', { name: /^House \/ flat no\. and street/ })
    .fill('42 Pit Lane, Bay 7');
  await page.getByRole('textbox', { name: /^PIN code/ }).fill(pincode);
  await page.getByRole('textbox', { name: /^City/ }).fill('Bengaluru');
  await page.getByRole('combobox', { name: /^State \/ UT/ }).selectOption({ label: 'Karnataka' });
}

for (const scenario of SCENARIOS) {
  test(`checkout with ${scenario.method.toUpperCase()}: cart → address → payment → review → success → orders → garage`, async ({
    page,
  }, testInfo) => {
    test.slow();
    const [carA, carB] = scenario.cars;
    const subtotal = carA.price + carB.price;
    const total = subtotal + scenario.shipping;

    await signIn(page, {
      email: uniqueEmail(testInfo, `checkout-${scenario.method}`),
      displayName: 'Arjun Racer',
    });

    // 1. Two cars into the pit stop.
    await addProductToCart(page, carA.slug, carA.name);
    await addProductToCart(page, carB.slug, carB.name);
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart (2 items)');

    // 2. Cart: lines, totals and the free-shipping indicator.
    await cartButton(page).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole('heading', { level: 1, name: /your pit stop/i })).toBeVisible();
    await expect(page.getByRole('link', { name: carA.name, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: carB.name, exact: true })).toBeVisible();
    const summary = page.locator('[aria-labelledby="cart-summary-title"]');
    await expect(summary).toContainText(inrPattern(subtotal));
    await expect(summary).toContainText(inrPattern(total));
    if (scenario.shipping > 0) {
      await expect(summary).toContainText(
        new RegExp(`Add\\s*${inrPattern(999 - subtotal).source}\\s*more for free shipping`),
      );
      await expect(summary).toContainText(inrPattern(scenario.shipping));
    } else {
      await expect(summary).toContainText(/free shipping unlocked/i);
      await expect(summary).toContainText('FREE');
    }

    // 3. START ENGINE → checkout (TEST MODE banner always visible).
    await summary.getByRole('link', { name: /start engine/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByText(/test mode/i).first()).toBeVisible();

    // 4. Address: Indian-format validation, then a valid address.
    await fillAddress(page, '12345', '0123');
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await expect(
      page.getByText('Enter a valid 10-digit mobile number starting with 6–9'),
    ).toBeVisible();
    await expect(page.getByText('Enter a valid 6-digit PIN code')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Mobile number/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    await page.getByRole('textbox', { name: /^Mobile number/ }).fill('9876543210');
    await page.getByRole('textbox', { name: /^PIN code/ }).fill('560001');
    await page.getByRole('button', { name: /continue to payment/i }).click();

    // 5. Payment method (cosmetic test UI; nothing is collected).
    // Card-style radios: the native input is visually hidden inside its label.
    const methodRadio = page.getByRole('radio', { name: scenario.methodLabel });
    await page
      .locator('label')
      .filter({ has: page.getByRole('radio', { name: scenario.methodLabel }) })
      .click();
    await expect(methodRadio).toBeChecked();
    await page.getByRole('button', { name: /review order/i }).click();

    // 6. Review → place order.
    const place = page.getByRole('button', { name: /^Place order/ });
    await expect(place).toBeVisible();
    await expect(place).toContainText(inrPattern(total));
    await expect(page.getByText('Arjun Racer').first()).toBeVisible();
    await place.click();

    // 7. Success page.
    await expect(page).toHaveURL(/\/checkout\/success\/[^/?#]+/, { timeout: 30_000 });
    const orderId = new URL(page.url()).pathname.split('/').pop() ?? '';
    expect(orderId.length).toBeGreaterThan(8);
    const orderRef = `#${orderId.slice(-8).toUpperCase()}`;
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/order confirmed/i);
    await expect(page.getByText(orderRef).first()).toBeVisible();
    // XP count-up: "+250 XP" (screen readers get the final value).
    await expect(page.getByText(/XP earned/i).first()).toBeVisible();
    await expect(page.getByRole('main')).toContainText(/\+[1-9][\d,]*\s*XP/);
    await expect(page.getByRole('heading', { name: /badges? unlocked/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'FIRST RIDE' })).toBeVisible();
    await expect(cartButton(page)).toHaveAccessibleName('Pit stop cart');
    // No double celebration: the badge modal is suppressed on the success page.
    await page.waitForTimeout(2500);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // 8. Orders list → detail.
    await gotoRoute(page, '/orders');
    const orderLink = page.getByRole('link', { name: `Order ${orderRef}` });
    await expect(orderLink).toBeVisible();
    await orderLink.click();
    await expect(page).toHaveURL(new RegExp(`/orders/${orderId}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText(orderRef);
    await expect(page.getByRole('main')).toContainText(carA.name);
    await expect(page.getByRole('main')).toContainText(carB.name);
    await expect(page.getByRole('main')).toContainText(scenario.methodText);
    await expect(page.getByRole('main')).toContainText(inrPattern(total));

    // 9. Garage: both cars parked automatically with source PURCHASED.
    await gotoRoute(page, '/garage');
    for (const car of scenario.cars) {
      const card = page.getByRole('article').filter({ hasText: car.name });
      await expect(card.first()).toBeVisible();
      await expect(card.first()).toContainText(/purchased/i);
    }
  });
}

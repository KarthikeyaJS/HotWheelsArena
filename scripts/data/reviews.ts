/**
 * Sample collector reviews: 40 reviews across 12 products (2–5 each).
 *
 * Stored at `products/{productId}/reviews/{uid}` — the document id is the reviewer uid, matching
 * the one-review-per-collector rule of the `submitReview` callable. Seed reviewers use uids
 * prefixed with `seed-`, so they can never collide with real Firebase Auth uids.
 * Product `ratingAvg` / `ratingCount` are computed from these at build time.
 * Every text satisfies `SubmitReviewSchema` (10–1000 characters) and every review is dated after
 * its product was listed.
 */
import type { SeedReview } from './types.ts';

export const SEED_REVIEWER_UID_PREFIX = 'seed-';

interface Reviewer {
  uid: string;
  displayName: string;
}

const reviewer = (slug: string, displayName: string): Reviewer => ({
  uid: `${SEED_REVIEWER_UID_PREFIX}${slug}`,
  displayName,
});

const R = {
  karthik: reviewer('karthik-subramanian', 'Karthik S.'),
  ananya: reviewer('ananya-reddy', 'Ananya R.'),
  dev: reviewer('dev-malhotra', 'Dev M.'),
  rohan: reviewer('rohan-mehta', 'Rohan M.'),
  meera: reviewer('meera-krishnan', 'Meera K.'),
  arjun: reviewer('arjun-menon', 'Arjun M.'),
  priya: reviewer('priya-nair', 'Priya N.'),
  harpreet: reviewer('harpreet-kaur', 'Harpreet K.'),
  sameer: reviewer('sameer-ansari', 'Sameer A.'),
  nikhil: reviewer('nikhil-joshi', 'Nikhil J.'),
  omkar: reviewer('omkar-pawar', 'Omkar P.'),
  lakshmi: reviewer('lakshmi-venkatesh', 'Lakshmi V.'),
  yash: reviewer('yash-thakur', 'Yash T.'),
  tanvi: reviewer('tanvi-shah', 'Tanvi S.'),
  vihaan: reviewer('vihaan-iyer', 'Vihaan I.'),
  siddharth: reviewer('siddharth-rao', 'Siddharth R.'),
  zoya: reviewer('zoya-khan', 'Zoya K.'),
  gaurav: reviewer('gaurav-bansal', 'Gaurav B.'),
  farhan: reviewer('farhan-qureshi', 'Farhan Q.'),
  aditya: reviewer('aditya-kulkarni', 'Aditya K.'),
  divya: reviewer('divya-pillai', 'Divya P.'),
  aniket: reviewer('aniket-chatterjee', 'Aniket C.'),
  rahul: reviewer('rahul-deshpande', 'Rahul D.'),
  neha: reviewer('neha-bhattacharya', 'Neha B.'),
  ishaan: reviewer('ishaan-gupta', 'Ishaan G.'),
  kabir: reviewer('kabir-singh', 'Kabir S.'),
  sneha: reviewer('sneha-patil', 'Sneha P.'),
} as const satisfies Record<string, Reviewer>;

interface ReviewInput {
  by: Reviewer;
  rating: 1 | 2 | 3 | 4 | 5;
  verifiedBuyer: boolean;
  createdAt: string;
  text: string;
}

function reviewsFor(productId: string, inputs: readonly ReviewInput[]): SeedReview[] {
  return inputs.map(({ by, rating, verifiedBuyer, createdAt, text }) => ({
    productId,
    uid: by.uid,
    displayName: by.displayName,
    photoURL: null,
    rating,
    text,
    verifiedBuyer,
    createdAt,
  }));
}

export const REVIEWS: readonly SeedReview[] = [
  ...reviewsFor('porsche-911-gt3-rs', [
    {
      by: R.karthik,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-09-10T19:24:00+05:30',
      text: 'The swan-neck wing is crisp and the Shark Blue looks deep under the garage lights. Proportions are spot on for 1:64 — easily the best 911 in my display case this year.',
    },
    {
      by: R.ananya,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-09-14T08:51:00+05:30',
      text: 'Arrived in Hyderabad in two days with a protector pack around the card. The wheel design is sharp and the door graphics are perfectly aligned.',
    },
    {
      by: R.dev,
      rating: 4,
      verifiedBuyer: false,
      createdAt: '2026-09-21T22:10:00+05:30',
      text: 'Gorgeous casting. One star off only because the rear wheels sit a touch high compared with the front — still a must-have for 911 fans.',
    },
  ]),
  ...reviewsFor('lamborghini-countach-lpi-800-4', [
    {
      by: R.rohan,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-09-24T13:05:00+05:30',
      text: 'The gold paint is unreal — almost liquid. The edition card, metal base and rubber tyres make it feel like a proper vault piece rather than just another car.',
    },
    {
      by: R.meera,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-09-26T17:42:00+05:30',
      text: 'Worth every rupee. The gold finish changes tone as you turn it in the light. Packed like jewellery — zero dents or scuffs on arrival in Kochi.',
    },
  ]),
  ...reviewsFor('land-rover-defender-110', [
    {
      by: R.arjun,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-01-05T20:15:00+05:30',
      text: 'Chunky, heavy and full of detail — the roof rack and spare wheel are my favourite bits. My son and I have already taken it on many carpet safaris.',
    },
    {
      by: R.priya,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-01-19T11:30:00+05:30',
      text: 'Lovely Pangea Green shade. The tyres are plastic rather than rubber, which is expected at this price, but they still look convincing.',
    },
    {
      by: R.harpreet,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-02-08T16:02:00+05:30',
      text: 'Bought three — one to open, two to keep carded. Delivery to Ludhiana was quick and every card was flat and crease-free.',
    },
    {
      by: R.sameer,
      rating: 4,
      verifiedBuyer: false,
      createdAt: '2026-03-02T09:47:00+05:30',
      text: 'Great casting with a solid metal body. I wish the headlights had painted detail, but for everyday collecting it is superb value.',
    },
    {
      by: R.nikhil,
      rating: 3,
      verifiedBuyer: true,
      createdAt: '2026-04-11T21:20:00+05:30',
      text: 'Nice casting, but my card had a soft corner. The pit crew offered a replacement quickly, so no complaints about the service.',
    },
  ]),
  ...reviewsFor('mahindra-thar', [
    {
      by: R.omkar,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-01-10T18:36:00+05:30',
      text: 'Finally a Thar in 1:64! The boxy stance is captured perfectly and the red looks just like the real Red Rage paint. A proud desi addition to my shelf.',
    },
    {
      by: R.lakshmi,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-02-14T12:12:00+05:30',
      text: 'Gifted it to my nephew, who owns a real Thar, and he was thrilled. Solid build, and the tyres have proper off-road tread.',
    },
    {
      by: R.yash,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-03-21T15:58:00+05:30',
      text: 'Great value. The soft-top detail could be sharper, but the overall shape is bang on.',
    },
    {
      by: R.tanvi,
      rating: 4,
      verifiedBuyer: false,
      createdAt: '2026-05-03T10:25:00+05:30',
      text: 'Cute and sturdy. It sits beautifully next to my Defender and Wrangler in the off-road corner of my display.',
    },
  ]),
  ...reviewsFor('toyota-supra-a80', [
    {
      by: R.vihaan,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-02-16T23:04:00+05:30',
      text: 'Chase edition in hand! The pearl orange and rubber tyres are gorgeous. It sold out within days, so I am glad I set a reminder for the drop.',
    },
    {
      by: R.siddharth,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-02-22T19:40:00+05:30',
      text: 'The A80 is the JDM icon and this casting does it justice — the rear wing, round tail lamps and low stance are all there.',
    },
    {
      by: R.zoya,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-03-01T14:18:00+05:30',
      text: 'Packed brilliantly with a clamshell protector. It is the centrepiece of my JDM shelf now.',
    },
    {
      by: R.gaurav,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-03-12T20:55:00+05:30',
      text: 'Beautiful car, but it is a premium for a chase piece. Worth it for the collection, just not an impulse buy.',
    },
    {
      by: R.farhan,
      rating: 5,
      verifiedBuyer: false,
      createdAt: '2026-04-07T17:33:00+05:30',
      text: "Saw one at a Mumbai collectors' meet and it looks even better in person. Hoping for a restock someday.",
    },
  ]),
  ...reviewsFor('nissan-gt-r-nismo', [
    {
      by: R.aditya,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-03-09T13:27:00+05:30',
      text: 'Silver paint with red accent lines looks sharp. The wheels are slightly oversized, but it still reads as a GT-R instantly.',
    },
    {
      by: R.karthik,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-03-30T21:48:00+05:30',
      text: 'Picked it up during the sale. The carbon-look bonnet is a great touch at this price.',
    },
    {
      by: R.divya,
      rating: 3,
      verifiedBuyer: true,
      createdAt: '2026-04-18T09:14:00+05:30',
      text: 'Good casting, but mine had a tiny paint chip near the rear arch. Still displays fine from a distance.',
    },
  ]),
  ...reviewsFor('tata-signa-fire-tender', [
    {
      by: R.aniket,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-04-02T18:09:00+05:30',
      text: 'An Indian fire tender in die-cast — brilliant! The ladder detail and red paint look fantastic lined up with the rest of my rescue fleet.',
    },
    {
      by: R.rahul,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-04-20T11:52:00+05:30',
      text: 'Lovely model at a great price. The plastic ladder is a little flexible, so handle it with care if kids are playing with it.',
    },
    {
      by: R.neha,
      rating: 4,
      verifiedBuyer: false,
      createdAt: '2026-05-15T16:37:00+05:30',
      text: "Bought it for my son's rescue-themed birthday and it was the star of the table. Chunky and durable.",
    },
  ]),
  ...reviewsFor('porsche-963-lmdh', [
    {
      by: R.ishaan,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2025-11-22T20:44:00+05:30',
      text: 'The livery lines on this prototype are razor sharp. It looks fast even when parked. Super-rare and worth the hunt.',
    },
    {
      by: R.kabir,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2025-12-06T15:21:00+05:30',
      text: 'Endurance racing fan here — the shark fin and the low nose are captured perfectly. Pairs well with the GR010 from the same series.',
    },
    {
      by: R.sneha,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-01-15T12:03:00+05:30',
      text: 'Premium feel and lovely paint. I wish it came with a display base, but I am very happy with it.',
    },
  ]),
  ...reviewsFor('porsche-911-carrera-rs-2-7', [
    {
      by: R.dev,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-06-29T19:16:00+05:30',
      text: 'The 1:43 scale lets the ducktail spoiler shine. The white paint is flawless and the acrylic base looks classy on my desk.',
    },
    {
      by: R.rohan,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-07-11T10:49:00+05:30',
      text: 'Beautiful classic 911. A little pricey compared with the 1:64 cars, but the extra detail is obvious the moment you unbox it.',
    },
  ]),
  ...reviewsFor('volt-serpent', [
    {
      by: R.yash,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-04-22T18:30:00+05:30',
      text: 'Wild design — the glowing battery pods and neon green paint pop on the shelf. My kids love racing it down the track.',
    },
    {
      by: R.tanvi,
      rating: 3,
      verifiedBuyer: true,
      createdAt: '2026-05-09T13:11:00+05:30',
      text: 'Looks great, but the tall rear end makes it tip over on loops. Better for display than for track runs.',
    },
    {
      by: R.vihaan,
      rating: 5,
      verifiedBuyer: false,
      createdAt: '2026-06-01T21:57:00+05:30',
      text: 'Fantasy castings are underrated and this one is a standout. The detail on the motor pods is incredible for the price.',
    },
  ]),
  ...reviewsFor('maruti-suzuki-swift-inrc-rally', [
    {
      by: R.omkar,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2025-12-10T17:25:00+05:30',
      text: 'An INRC rally Swift! As someone who grew up watching rallies in the Western Ghats, this made my day. The spot lamps and mud flaps are spot on.',
    },
    {
      by: R.lakshmi,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2025-12-28T11:40:00+05:30',
      text: 'Great little hatch with a fun livery. The number roundel is slightly off-centre on mine, but it is still charming.',
    },
    {
      by: R.arjun,
      rating: 5,
      verifiedBuyer: true,
      createdAt: '2026-01-26T09:05:00+05:30',
      text: 'Incredible value for money. Every Indian collector should have this one in the garage.',
    },
    {
      by: R.gaurav,
      rating: 2,
      verifiedBuyer: true,
      createdAt: '2026-02-19T22:31:00+05:30',
      text: 'The casting is nice, but mine arrived with a cracked blister and the replacement took a week. The car itself is fine.',
    },
  ]),
  ...reviewsFor('jeep-wrangler-rubicon', [
    {
      by: R.sneha,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-01-08T14:46:00+05:30',
      text: 'Great off-roader with a proper removable-roof look. The orange is a little deeper than in the photos, but I actually prefer it.',
    },
    {
      by: R.aniket,
      rating: 4,
      verifiedBuyer: true,
      createdAt: '2026-02-02T19:03:00+05:30',
      text: 'Solid build and chunky tyres. It looks fantastic parked next to the Thar.',
    },
    {
      by: R.farhan,
      rating: 2,
      verifiedBuyer: false,
      createdAt: '2026-03-15T12:22:00+05:30',
      text: 'I expected more detail on the grille — it looks flat compared with other castings in the series. Okay for kids, less so for collectors.',
    },
  ]),
];

/**
 * Side-profile geometry for each car body, drawn facing RIGHT in an 800×450 canvas with the
 * ground at y = 362. `top` traces the silhouette from the rear-bottom corner over the roof to the
 * front-bottom corner; `shellPath` closes it along the sill and cuts the wheel arches around the
 * wheel centres, so every body keeps consistent wheel clearance.
 */
import type { CarBody } from '../data/placeholders.ts';
import { n } from './svg.ts';

export const GROUND_Y = 362;

export interface WheelSpec {
  cx: number;
  cy: number;
  /** Tyre radius. */
  r: number;
  /** Arch cut-out radius (tyre radius + clearance). */
  archR: number;
}

export interface BodyGeometry {
  /** Open path: rear-bottom corner → over the top → front-bottom corner. */
  top: string;
  /** y of the body's underside between and around the arches. */
  sill: number;
  wheels: { rear: WheelSpec; front: WheelSpec };
  /** Side glass (daylight opening). */
  glass: string;
  /** Window pillars, stroked in dark trim over the glass. */
  pillars?: string;
  /** Diagonal reflection streak on the glass. */
  glint: string;
  /** Panel gaps / door handles (thin dark strokes). */
  lines: string;
  /** Dark trim fills: sills, splitters, diffusers, intakes, bumpers. */
  trim: string;
  /** Extra body-coloured panels (mirrors, fins, scoops). */
  bodyParts?: string;
  headlight: string;
  headlightGlow: { cx: number; cy: number };
  taillight: string;
  /** Feature line that catches the light along the flank. */
  character: string;
  /** Roof span for light bars / racks. */
  roof: { x1: number; x2: number; y: number };
  /** Door centre for race roundels and badges. */
  door: { cx: number; cy: number };
  /** Vertical extent used by the paint gradient. */
  paintRange: readonly [number, number];
  /** Band used by livery stripes. */
  stripeBand: readonly [number, number];
  /** Front bumper anchor for push bars and spot lamps. */
  front: { x: number; y: number };
  /** Draw thick fender flares around the arches (off-roaders). */
  flares?: boolean;
}

export const BODIES: Readonly<Record<CarBody, BodyGeometry>> = {
  supercar: {
    top: 'M72 328L68 276Q68 256 90 252L178 246C240 240 300 230 346 212C382 198 430 194 470 196C506 198 530 206 556 222L660 268C696 276 722 282 732 292Q738 300 736 310L734 320Q732 328 722 328',
    sill: 328,
    wheels: {
      rear: { cx: 210, cy: 310, r: 52, archR: 61 },
      front: { cx: 590, cy: 310, r: 52, archR: 61 },
    },
    glass:
      'M362 216C394 204 432 200 468 202C500 204 522 212 544 226L592 252L384 250C368 248 356 236 362 216Z',
    glint: 'M452 204L478 206L436 249L410 249Z',
    lines: 'M418 254L410 314M430 268L456 266',
    trim: 'M304 262C334 254 368 252 400 256L394 282C364 281 336 285 307 292ZM272 314L530 314L527 328L275 328ZM692 322L736 316L740 326L694 330ZM78 314L150 316L150 328L80 328Z',
    bodyParts: 'M572 240Q584 230 602 234L600 244Q584 248 574 246Z',
    headlight: 'M706 280L733 289L731 297L703 289Z',
    headlightGlow: { cx: 736, cy: 292 },
    taillight: 'M69 262L96 256L97 266L70 272Z',
    character: 'M100 272C230 264 440 262 706 288',
    roof: { x1: 400, x2: 530, y: 195 },
    door: { cx: 478, cy: 290 },
    paintRange: [194, 330],
    stripeBand: [262, 300],
    front: { x: 736, y: 310 },
  },

  coupe: {
    top: 'M80 328L74 296Q74 276 94 270C150 262 200 246 248 222C290 200 340 184 392 181C434 179 468 186 496 200L564 238C620 246 686 254 716 264Q736 272 736 292L734 320Q732 328 720 328',
    sill: 328,
    wheels: {
      rear: { cx: 208, cy: 310, r: 52, archR: 61 },
      front: { cx: 582, cy: 310, r: 52, archR: 61 },
    },
    glass:
      'M300 214C330 196 368 190 404 190C438 190 466 198 486 210L532 240L312 240Q290 238 300 214Z',
    pillars: 'M414 191L410 240',
    glint: 'M452 195L476 199L438 238L414 238Z',
    lines: 'M420 246L414 312M432 262L458 261',
    trim: 'M268 314L524 314L521 328L271 328ZM692 322L736 316L740 326L694 330ZM82 316L148 318L148 328L84 328Z',
    bodyParts: 'M540 230Q552 220 570 224L568 234Q552 238 542 236Z',
    headlight: 'M700 266Q716 258 731 268Q733 278 722 282Q706 282 700 274Z',
    headlightGlow: { cx: 730, cy: 273 },
    taillight: 'M75 280L104 274L104 284L76 290Z',
    character: 'M104 282C240 272 440 262 712 278',
    roof: { x1: 340, x2: 470, y: 181 },
    door: { cx: 478, cy: 288 },
    paintRange: [180, 330],
    stripeBand: [268, 302],
    front: { x: 736, y: 302 },
  },

  muscle: {
    top: 'M70 328L68 276L76 262L176 256C204 250 232 236 256 216C282 196 318 188 360 187L420 188C442 190 460 198 474 210L512 244L722 252Q739 254 741 266L741 316Q741 328 727 328',
    sill: 328,
    wheels: {
      rear: { cx: 196, cy: 310, r: 53, archR: 62 },
      front: { cx: 604, cy: 310, r: 53, archR: 62 },
    },
    glass:
      'M276 220C294 202 322 196 360 196L416 197C433 199 447 206 458 216L480 242L286 242Q270 240 276 220Z',
    pillars: 'M392 197L390 242',
    glint: 'M428 200L452 204L428 240L402 240Z',
    lines: 'M398 248L394 316M408 262L434 261M522 250L716 258',
    trim: 'M256 314L546 314L543 328L259 328ZM734 264L741 264L741 306L734 306ZM702 320L741 316L742 328L704 330Z',
    bodyParts: 'M592 253L600 240L650 241L656 254ZM496 230Q508 220 526 224L524 234Q508 238 498 236Z',
    headlight: 'M718 264L740 265L740 278L718 277Z',
    headlightGlow: { cx: 740, cy: 272 },
    taillight: 'M68 268L82 266L82 278L68 280Z',
    character: 'M90 284C260 276 480 270 724 282',
    roof: { x1: 320, x2: 430, y: 187 },
    door: { cx: 460, cy: 288 },
    paintRange: [186, 330],
    stripeBand: [270, 304],
    front: { x: 741, y: 302 },
  },

  offroad: {
    top: 'M84 316L78 198Q78 178 98 176L470 172Q487 172 495 184L540 238L712 244Q733 246 735 264L737 304Q737 316 723 316',
    sill: 316,
    wheels: {
      rear: { cx: 212, cy: 304, r: 58, archR: 68 },
      front: { cx: 590, cy: 304, r: 58, archR: 68 },
    },
    glass: 'M106 190L462 186Q474 186 480 194L520 236L106 238Z',
    pillars: 'M204 188L204 238M336 187L336 238',
    glint: 'M392 189L420 189L380 237L352 237Z',
    lines: 'M340 242L340 300M470 242L474 300M352 258L376 258M484 258L508 258',
    trim: 'M280 318L522 318L522 329L280 329ZM704 300L739 298L742 316L706 320ZM78 290L92 290L92 316L80 316Z',
    headlight: 'M718 252Q730 250 736 256L736 270Q730 274 718 272Z',
    headlightGlow: { cx: 738, cy: 262 },
    taillight: 'M80 206L91 206L91 236L81 236Z',
    character: 'M92 256L728 258',
    roof: { x1: 250, x2: 430, y: 164 },
    door: { cx: 404, cy: 280 },
    paintRange: [172, 318],
    stripeBand: [262, 292],
    front: { x: 738, y: 290 },
    flares: true,
  },

  prototype: {
    top: 'M62 332L58 292L122 282C200 276 280 264 332 238C362 216 394 200 432 197C472 195 502 205 522 223C562 254 640 272 718 288Q748 294 748 312L746 326Q744 332 732 332',
    sill: 332,
    wheels: {
      rear: { cx: 196, cy: 314, r: 48, archR: 56 },
      front: { cx: 604, cy: 314, r: 48, archR: 56 },
    },
    glass: 'M402 210C432 203 470 203 494 215L512 232L420 235Q397 233 402 210Z',
    glint: 'M452 205L472 207L452 232L436 232Z',
    lines: 'M340 246C390 252 440 256 520 258',
    trim: 'M252 290C272 280 300 276 330 278L326 298C300 296 278 300 256 306ZM252 318L550 318L548 332L256 332ZM700 324L748 318L752 330L702 334ZM60 318L142 320L142 332L62 332Z',
    bodyParts: 'M128 282L138 238C220 228 330 212 420 198L430 204C340 226 240 252 150 280Z',
    headlight: 'M698 282L732 290L730 298L696 290Z',
    headlightGlow: { cx: 736, cy: 294 },
    taillight: 'M58 296L80 294L80 302L59 305Z',
    character: 'M150 302C300 292 520 288 720 302',
    roof: { x1: 410, x2: 500, y: 197 },
    door: { cx: 462, cy: 282 },
    paintRange: [196, 334],
    stripeBand: [270, 306],
    front: { x: 748, y: 312 },
  },

  rescue: {
    top: 'M60 324L58 160Q58 146 72 146L520 146Q532 146 534 158L534 170L640 170Q656 170 664 184L718 240L730 250Q742 256 742 272L742 312Q742 324 728 324',
    sill: 324,
    wheels: {
      rear: { cx: 190, cy: 310, r: 52, archR: 62 },
      front: { cx: 612, cy: 310, r: 52, archR: 62 },
    },
    glass: 'M558 184L644 184Q652 186 658 196L700 240L558 240Z',
    glint: 'M612 186L632 186L600 238L580 238Z',
    lines: 'M538 170L538 322M90 194H250V240H90ZM270 194H510V240H270ZM548 246L548 312M560 262H584',
    trim: 'M722 300L744 300L746 322L722 324ZM56 308L110 308L110 318L56 318ZM253 314L550 314L550 324L253 324Z',
    headlight: 'M726 262L742 262L742 276L726 276Z',
    headlightGlow: { cx: 744, cy: 270 },
    taillight: 'M58 280L68 280L68 300L58 300Z',
    character: 'M62 300L534 300',
    roof: { x1: 566, x2: 640, y: 170 },
    door: { cx: 300, cy: 272 },
    paintRange: [146, 326],
    stripeBand: [252, 276],
    front: { x: 742, y: 300 },
  },

  fantasy: {
    top: 'M70 316L64 262Q64 240 86 236L150 232C168 204 188 176 222 170L328 170C346 172 356 184 362 202L372 226L700 256Q722 260 724 276L724 304Q724 316 710 316',
    sill: 316,
    wheels: {
      rear: { cx: 200, cy: 300, r: 62, archR: 70 },
      front: { cx: 622, cy: 322, r: 40, archR: 48 },
    },
    glass: 'M236 184L322 184Q336 186 342 198L348 212L232 212Q228 196 236 184Z',
    pillars: 'M290 184L290 212',
    glint: 'M302 185L318 185L306 211L292 211Z',
    lines: 'M300 218L298 300M312 232H336',
    trim: 'M690 300L726 298L728 316L692 318ZM64 300L120 302L120 316L66 316Z',
    headlight: 'M702 262L724 266L724 278L702 276Z',
    headlightGlow: { cx: 726, cy: 272 },
    taillight: 'M65 250L78 248L78 262L65 264Z',
    character: 'M90 262C300 250 500 262 700 272',
    roof: { x1: 230, x2: 320, y: 170 },
    door: { cx: 290, cy: 266 },
    paintRange: [168, 318],
    stripeBand: [248, 290],
    front: { x: 724, y: 300 },
  },

  hatch: {
    top: 'M100 330L96 262Q96 226 118 210C150 186 190 176 236 174L420 172C446 172 466 180 482 194L548 238C610 244 664 250 690 262Q706 270 704 292L702 322Q700 330 688 330',
    sill: 330,
    wheels: {
      rear: { cx: 196, cy: 314, r: 48, archR: 58 },
      front: { cx: 566, cy: 314, r: 48, archR: 58 },
    },
    glass:
      'M132 214C162 194 200 186 240 186L416 184C438 184 454 190 466 200L518 236L126 238Q120 226 132 214Z',
    pillars: 'M250 186L250 238M392 185L392 238',
    glint: 'M430 188L452 192L424 236L402 236Z',
    lines: 'M398 242L396 316M258 242L256 312M410 258H432',
    trim: 'M108 214L146 190L158 196L118 220ZM254 316L510 316L508 330L256 330ZM660 326L704 320L708 330L662 334ZM98 318L140 320L140 330L100 330Z',
    bodyParts: 'M520 222Q532 212 550 216L548 226Q532 230 522 228Z',
    headlight: 'M672 258L700 266L698 276L670 268Z',
    headlightGlow: { cx: 702, cy: 270 },
    taillight: 'M97 244L109 236L111 256L98 262Z',
    character: 'M104 272C260 264 480 258 696 274',
    roof: { x1: 260, x2: 400, y: 173 },
    door: { cx: 326, cy: 282 },
    paintRange: [172, 332],
    stripeBand: [264, 300],
    front: { x: 704, y: 298 },
  },
};

/** Horizontal half-width of an arch cut where it meets the sill. */
function archHalfWidth(wheel: WheelSpec, sill: number): number {
  const dy = sill - wheel.cy;
  return Math.sqrt(Math.max(0, wheel.archR * wheel.archR - dy * dy));
}

/** SVG arc from the right end of an arch over the wheel to its left end. */
function archArc(wheel: WheelSpec, sill: number): string {
  const half = archHalfWidth(wheel, sill);
  const large = sill > wheel.cy ? 1 : 0;
  return `A${n(wheel.archR)} ${n(wheel.archR)} 0 ${large} 0 ${n(wheel.cx - half)} ${n(sill)}`;
}

/** Closed body outline with both wheel arches cut out. */
export function shellPath(body: BodyGeometry): string {
  const { rear, front } = body.wheels;
  const s = body.sill;
  return (
    `${body.top}L${n(front.cx + archHalfWidth(front, s))} ${n(s)}${archArc(front, s)}` +
    `L${n(rear.cx + archHalfWidth(rear, s))} ${n(s)}${archArc(rear, s)}Z`
  );
}

/** Dark wheel-well shape visible inside an arch (above the sill line). */
export function wellPath(wheel: WheelSpec, sill: number): string {
  return `M${n(wheel.cx + archHalfWidth(wheel, sill))} ${n(sill)}${archArc(wheel, sill)}Z`;
}

/** Open arc used for fender flares. */
export function flarePath(wheel: WheelSpec, sill: number): string {
  return `M${n(wheel.cx + archHalfWidth(wheel, sill))} ${n(sill)}${archArc(wheel, sill)}`;
}

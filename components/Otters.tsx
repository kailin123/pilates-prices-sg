/* Little otter mascots, hand-drawn as inline SVG (no external assets). */

const FUR = "#7a5a42";
const FUR_DARK = "#6b4d38";
const CREAM = "#e6d3b8";
const EYE = "#241a12";
const LIME = "#c6ff3a";
const BLUSH = "#ff8a6a";

/** Otter holding up a Singapore flag and giving a little wave. */
export function OtterFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 84" className={className} role="img" aria-label="Otter mascot holding a Singapore flag and waving">
      {/* flag */}
      <line x1="44" y1="48" x2="44" y2="8" stroke="#9aa08f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 7h16v6H44z" fill="#EF3340" />
      <path d="M44 13h16v6H44z" fill="#ffffff" />
      <circle cx="49" cy="10" r="2.2" fill="#fff" />
      <circle cx="50.4" cy="10" r="1.8" fill="#EF3340" />
      <circle cx="53.6" cy="9" r="0.6" fill="#fff" />
      <circle cx="53.6" cy="11.2" r="0.6" fill="#fff" />
      <circle cx="55.5" cy="10.1" r="0.6" fill="#fff" />
      {/* body */}
      <ellipse cx="27" cy="60" rx="15" ry="19" fill={FUR} />
      <ellipse cx="27" cy="64" rx="8.5" ry="12" fill={CREAM} />
      {/* right arm to pole */}
      <path d="M38 52 Q44 46 44 40" stroke={FUR} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="40" r="4" fill={FUR_DARK} />
      {/* waving left arm */}
      <g className="otter-wave">
        <path d="M17 54 Q10 46 9 37" stroke={FUR} strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="9" cy="36" r="4" fill={FUR_DARK} />
        <path d="M3 31q-2 3 0 6M1 29q-2 4 0 9" stroke="#9a9d94" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      {/* head */}
      <circle cx="27" cy="38" r="14" fill={FUR} />
      <circle cx="17" cy="28" r="4.5" fill={FUR_DARK} />
      <circle cx="37" cy="28" r="4.5" fill={FUR_DARK} />
      <ellipse cx="27" cy="43" rx="7.5" ry="6" fill={CREAM} />
      <ellipse cx="16.5" cy="43" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <ellipse cx="37.5" cy="43" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <circle cx="21" cy="37" r="3" fill={EYE} />
      <circle cx="33" cy="37" r="3" fill={EYE} />
      <circle cx="22" cy="36" r="1" fill="#fff" />
      <circle cx="34" cy="36" r="1" fill="#fff" />
      <ellipse cx="27" cy="41" rx="2.2" ry="1.5" fill={EYE} />
      <path d="M27 42.5q-2 2-4 1M27 42.5q2 2 4 1" stroke={EYE} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M12 30q15-9 30 0" stroke={LIME} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Otter doing pilates on a reformer machine (side view). */
export function OtterReformer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} role="img" aria-label="Otter mascot doing pilates on a reformer machine">
      <rect x="6" y="46" width="108" height="4" rx="2" fill="#565a52" />
      <rect x="14" y="48" width="5" height="13" rx="1" fill="#4a4d46" />
      <rect x="100" y="48" width="5" height="13" rx="1" fill="#4a4d46" />
      <rect x="99" y="22" width="4" height="24" fill="#6b6f66" />
      <rect x="92" y="21" width="16" height="3.5" rx="1.75" fill="#6b6f66" />
      <rect x="25" y="31" width="4" height="7" rx="2" fill="#6b6f66" />
      <rect x="32" y="31" width="4" height="7" rx="2" fill="#6b6f66" />
      <path d="M82 42q3-3 5 0t5 0t5 0" stroke="#ff5c39" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="24" y="38" width="58" height="7" rx="3" fill={LIME} />
      <ellipse cx="52" cy="33" rx="15" ry="6.5" fill={FUR} />
      <ellipse cx="54" cy="35" rx="9" ry="3.5" fill={CREAM} />
      <path d="M64 34 Q82 30 96 29" stroke={FUR} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="29" r="3" fill={FUR_DARK} />
      <path d="M64 37 Q82 36 96 33" stroke={FUR} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="33" r="3" fill={FUR_DARK} />
      <circle cx="30" cy="31" r="8.5" fill={FUR} />
      <circle cx="25" cy="25" r="3" fill={FUR_DARK} />
      <circle cx="35" cy="25" r="3" fill={FUR_DARK} />
      <ellipse cx="30" cy="34" rx="5" ry="3.8" fill={CREAM} />
      <ellipse cx="24.5" cy="33.5" rx="2.3" ry="1.5" fill={BLUSH} opacity="0.5" />
      <ellipse cx="35.5" cy="33.5" rx="2.3" ry="1.5" fill={BLUSH} opacity="0.5" />
      <circle cx="27" cy="30" r="2.1" fill={EYE} />
      <circle cx="33" cy="30" r="2.1" fill={EYE} />
      <circle cx="27.7" cy="29.3" r="0.7" fill="#fff" />
      <circle cx="33.7" cy="29.3" r="0.7" fill="#fff" />
      <ellipse cx="30" cy="33" rx="1.5" ry="1" fill={EYE} />
      <path d="M23 26q7-4 14 0" stroke={LIME} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Otter peeking over an edge (paws gripping, head above). */
export function OtterPeek({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" className={className} role="img" aria-label="Otter mascot peeking">
      <ellipse cx="15" cy="33" rx="4.5" ry="3.5" fill={FUR_DARK} />
      <ellipse cx="33" cy="33" rx="4.5" ry="3.5" fill={FUR_DARK} />
      <circle cx="24" cy="19" r="13" fill={FUR} />
      <circle cx="14" cy="9" r="4.5" fill={FUR_DARK} />
      <circle cx="34" cy="9" r="4.5" fill={FUR_DARK} />
      <ellipse cx="24" cy="24" rx="7" ry="5" fill={CREAM} />
      <ellipse cx="14" cy="23" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <ellipse cx="34" cy="23" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <circle cx="18.5" cy="17" r="3" fill={EYE} />
      <circle cx="29.5" cy="17" r="3" fill={EYE} />
      <circle cx="19.5" cy="16" r="1" fill="#fff" />
      <circle cx="30.5" cy="16" r="1" fill="#fff" />
      <ellipse cx="24" cy="21" rx="2" ry="1.4" fill={EYE} />
      <path d="M24 22.5q-2 2-4 1M24 22.5q2 2 4 1" stroke={EYE} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M12 11q12-6 24 0" stroke={LIME} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Plain cute sitting otter. */
export function OtterSit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 68" className={className} role="img" aria-label="Otter mascot sitting">
      {/* tail */}
      <path d="M40 58 Q54 56 50 42" stroke={FUR} strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* feet */}
      <ellipse cx="20" cy="63" rx="6" ry="4" fill={FUR_DARK} />
      <ellipse cx="36" cy="63" rx="6" ry="4" fill={FUR_DARK} />
      {/* body */}
      <ellipse cx="28" cy="46" rx="14" ry="15" fill={FUR} />
      <ellipse cx="28" cy="49" rx="8" ry="10" fill={CREAM} />
      <circle cx="22" cy="50" r="3.5" fill={FUR_DARK} />
      <circle cx="34" cy="50" r="3.5" fill={FUR_DARK} />
      {/* head */}
      <circle cx="28" cy="24" r="13" fill={FUR} />
      <circle cx="18" cy="13" r="4.5" fill={FUR_DARK} />
      <circle cx="38" cy="13" r="4.5" fill={FUR_DARK} />
      <ellipse cx="28" cy="28" rx="7" ry="5.5" fill={CREAM} />
      <ellipse cx="17.5" cy="28" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <ellipse cx="38.5" cy="28" rx="3" ry="2" fill={BLUSH} opacity="0.5" />
      <circle cx="22" cy="23" r="3" fill={EYE} />
      <circle cx="34" cy="23" r="3" fill={EYE} />
      <circle cx="23" cy="22" r="1" fill="#fff" />
      <circle cx="35" cy="22" r="1" fill="#fff" />
      <ellipse cx="28" cy="26" rx="2" ry="1.4" fill={EYE} />
      <path d="M28 27.5q-2 2-4 1M28 27.5q2 2 4 1" stroke={EYE} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M15 15q13-7 26 0" stroke={LIME} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

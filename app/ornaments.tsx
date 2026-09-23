// Original decorative artwork, drawn as inline SVG so it needs no image files.
import type { CSSProperties } from "react";

export function CrossDoves({ style }: { style?: CSSProperties }) {
  return (
    <svg
      className="ornament"
      width="220"
      height="64"
      viewBox="0 0 220 64"
      fill="none"
      aria-hidden="true"
      style={style}
    >
      {/* olive branch, left */}
      <path d="M8 40 C 30 34, 52 34, 74 40" stroke="#9db98a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="22" cy="35" rx="7" ry="3.6" fill="#9db98a" transform="rotate(-22 22 35)" />
      <ellipse cx="40" cy="32" rx="7" ry="3.6" fill="#b3cba2" transform="rotate(-14 40 32)" />
      <ellipse cx="58" cy="34" rx="6.5" ry="3.4" fill="#9db98a" transform="rotate(-6 58 34)" />

      {/* cross */}
      <rect x="105" y="10" width="10" height="44" rx="3" fill="#d9ad4e" />
      <rect x="92" y="23" width="36" height="10" rx="3" fill="#d9ad4e" />
      <rect x="107.5" y="10" width="3" height="44" fill="#eac877" />

      {/* rays */}
      <path d="M110 4 v-4 M96 8 l-2.5-3.5 M124 8 l2.5-3.5" stroke="#eac877" strokeWidth="2" strokeLinecap="round" />

      {/* dove */}
      <path
        d="M168 30 c6-7 16-8 22-3 c-3 1-5 3-6 5 c5-1 9 1 11 4 c-4 0-7 2-9 5 c-4 5-12 7-18 4 c-5-2-7-8-4-12 z"
        fill="#ffffff"
        stroke="#cbd7ea"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M176 32 c4-4 10-5 15-3 c-4 2-7 5-9 8 c-3-1-5-3-6-5 z" fill="#e8eef8" />
      <circle cx="187" cy="28" r="1.2" fill="#55617a" />

      {/* olive branch, right */}
      <path d="M212 46 C 204 44, 198 42, 194 40" stroke="#9db98a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="205" cy="42" rx="6" ry="3.2" fill="#b3cba2" transform="rotate(14 205 42)" />
    </svg>
  );
}

export function ChurchBranches({ style }: { style?: CSSProperties }) {
  return (
    <svg
      className="ornament-foot"
      width="240"
      height="70"
      viewBox="0 0 240 70"
      fill="none"
      aria-hidden="true"
      style={style}
    >
      {/* branches */}
      <path d="M6 58 C 34 48, 58 46, 82 50" stroke="#9db98a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="24" cy="50" rx="8" ry="3.8" fill="#b3cba2" transform="rotate(-20 24 50)" />
      <ellipse cx="46" cy="46" rx="8" ry="3.8" fill="#9db98a" transform="rotate(-10 46 46)" />
      <ellipse cx="68" cy="47" rx="7" ry="3.4" fill="#b3cba2" transform="rotate(-4 68 47)" />

      <path d="M234 58 C 206 48, 182 46, 158 50" stroke="#9db98a" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="216" cy="50" rx="8" ry="3.8" fill="#b3cba2" transform="rotate(20 216 50)" />
      <ellipse cx="194" cy="46" rx="8" ry="3.8" fill="#9db98a" transform="rotate(10 194 46)" />
      <ellipse cx="172" cy="47" rx="7" ry="3.4" fill="#b3cba2" transform="rotate(4 172 47)" />

      {/* church */}
      <rect x="104" y="34" width="32" height="26" rx="2" fill="#e3ba6a" />
      <path d="M100 34 L120 18 L140 34 z" fill="#c98f4a" />
      <rect x="116" y="44" width="8" height="16" rx="1.5" fill="#8a6420" />
      <circle cx="120" cy="30" r="3" fill="#fbead0" />
      <rect x="118.6" y="8" width="2.8" height="11" rx="1" fill="#d9ad4e" />
      <rect x="115" y="11" width="10" height="2.8" rx="1" fill="#d9ad4e" />
    </svg>
  );
}

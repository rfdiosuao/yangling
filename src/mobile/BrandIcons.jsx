import React from 'react'
const paths = {
  brand:<><path d="M11 5C5 10 4 24 14 30c8 5 18 0 19-9-3 6-11 8-16 3-5-5-2-11 3-16"/><path d="M21 5c-2 6-7 9-6 14 1 6 10 6 12 0 1-5-3-8-6-14Z"/><path d="M20 22v7"/></>,
  cup:<><path d="M7 16h21v5a10.5 10.5 0 0 1-21 0v-5Z"/><path d="M28 17h3c7 0 6 10-3 10M6 33h24M12 11c-4-4 4-5 0-9M20 11c-4-4 4-5 0-9"/></>,
  move:<><circle cx="23" cy="8" r="3"/><path d="M10 16 16 13 18 4M16 13l5 7 8-3M16 13l-3 12-5 10M13 25l9 10"/></>,
  breath:<><path d="M20 31C7 30 3 21 4 12c7 0 13 4 16 11 3-7 9-11 16-11 1 9-3 18-16 19Z"/><path d="M13 15c0-5 3-10 7-13 4 3 7 8 7 13M20 23v8"/></>,
  home:<><path d="m4 18 16-13 16 13M8 16v18h8V23h8v11h8V16"/></>,
  knowledge:<><path d="M20 10c-5-4-10-4-16-3v25c6-1 11-1 16 3 5-4 10-4 16-3V7c-6-1-11-1-16 3Zm0 0v25"/></>,
  motion:<><path d="M9 33V23M20 33V8M31 33V17"/></>,
  user:<><circle cx="20" cy="13" r="6"/><path d="M7 34c0-15 26-15 26 0"/></>,
  bot:<><rect x="6" y="11" width="28" height="23" rx="10"/><path d="M20 11V6c4 0 6-2 6-5-4-1-6 1-6 5M15 25c3 3 7 3 10 0"/><circle cx="14" cy="20" r="1"/><circle cx="26" cy="20" r="1"/></>,
}
export default function BrandIcon({name,size=32,...props}) {return <svg viewBox="0 0 40 40" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]||paths.breath}</svg>}

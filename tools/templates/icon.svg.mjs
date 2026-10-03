// The site mark: "PN" drawn from plain shapes inside the red box, so it needs no font and stays crisp at 16px.
// full = true fills the whole square (maskable and Apple icons), otherwise the tile has rounded corners.
export function iconSVG({ full = false } = {}) {
  const s = full ? 0.8 : 1; // maskable icons keep the art inside the 80% safe zone
  const o = (512 - 512 * s) / 2;
  const art = `<g transform="translate(${o} ${o}) scale(${s})">
<rect x="76" y="76" width="360" height="360" fill="none" stroke="#ff4d40" stroke-width="24"/>
<path fill="#f0eee9" fill-rule="evenodd" d="M132 150H238V280H174V362H132ZM174 188V242H198V188Z"/>
<path fill="#f0eee9" d="M266 362V150H306L340 262V150H380V362H340L306 250V362Z"/>
</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512"${full ? "" : ' rx="104"'} fill="#0b0b0c"/>${art}</svg>\n`;
}

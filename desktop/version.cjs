// Krahasimi i versioneve për përditësimin (pa Electron, që të provohet me teste).

/** Versioni nga titulli i publikimit, p.sh. "Programet për Windows (0.1.42)" -> "0.1.42". */
function versionFromTitle(title) {
  const m = /\((\d+(?:\.\d+)+)\)/.exec(String(title || ''));
  return m ? m[1] : null;
}

/** A është versioni a më i ri se b? */
function isNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Emri i instaluesit të këtij programi te publikimi. */
const installerName = (editionName) => `${editionName.replace(/\s+/g, '-')}-Setup.exe`;

/**
 * Përditësimi vetëm nga faqja jonë: versioni i publikuar lexohet te VERSION_URL
 * ({"produkti":"allsolutiontech-cad","windows":"0.1.25","android":"0.1.8","faqja":"…"}) dhe butoni hap
 * gjithmonë DOWNLOAD_PAGE (e shkruar këtu, jo ajo e JSON-it). Programi nuk shkarkon asgjë vetë.
 */
const VERSION_URL = 'https://allsolutiontech.de/soft/cad/versioni.json';
const DOWNLOAD_PAGE = 'https://allsolutiontech.de/soft/#cad';

/** Versioni i platformës ("windows" ose "android") nga versioni.json, ose null kur s'është i vlefshëm. */
function siteVersion(json, platform) {
  if (!json || typeof json !== 'object' || json.produkti !== 'allsolutiontech-cad') return null;
  const v = json[platform];
  return typeof v === 'string' && /^\d+(\.\d+)+$/.test(v.trim()) ? v.trim() : null;
}

module.exports = { installerName, isNewer, versionFromTitle, siteVersion, VERSION_URL, DOWNLOAD_PAGE };

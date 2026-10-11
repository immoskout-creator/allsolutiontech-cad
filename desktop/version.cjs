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

module.exports = { installerName, isNewer, versionFromTitle };

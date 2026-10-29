/* eslint-disable @next/next/no-img-element */
// Deux versions du logo horizontal ; la feuille de style affiche celle qui convient au thème.
export function Logo({ width = 180 }: { width?: number }) {
  const height = Math.round(width / 3.33);
  return (
    <>
      <img className="kr-logo kr-logo--light" src="/brand/logo-horizontal-clair.svg" alt="Keyroom" width={width} height={height} />
      <img className="kr-logo kr-logo--dark" src="/brand/logo-horizontal-sombre.svg" alt="Keyroom" width={width} height={height} />
    </>
  );
}

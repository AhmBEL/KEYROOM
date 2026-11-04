import "server-only";
import { headers } from "next/headers";
import { isLang, type Lang } from "./i18n";

// ?lang=fr|en s'il est présent, sinon la langue du navigateur : français si elle commence par « fr », sinon anglais.
export async function pickLang(param: string | string[] | undefined): Promise<{ lang: Lang; explicit: boolean }> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isLang(p)) return { lang: p, explicit: true };
  const accept = ((await headers()).get("accept-language") ?? "").trim();
  return { lang: accept && !/^fr/i.test(accept) ? "en" : "fr", explicit: false };
}

import "server-only";
import { headers } from "next/headers";
import { isLang, type Lang } from "./i18n";

// ?lang=fr|en s'il est présent, sinon la langue du navigateur (anglais si elle commence par « en »).
export async function pickLang(param: string | string[] | undefined): Promise<Lang> {
  const p = Array.isArray(param) ? param[0] : param;
  if (isLang(p)) return p;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^\s*en/i.test(accept) ? "en" : "fr";
}

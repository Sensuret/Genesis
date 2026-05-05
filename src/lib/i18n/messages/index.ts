/**
 * Locale registry — maps each supported `Locale` to its message bundle.
 *
 * Bundles are imported eagerly because they're tiny (~5KB each gzipped)
 * and switching locales must be instant. If the bundle set ever crosses
 * a few hundred KB we'll switch to dynamic imports keyed by the active
 * locale — but until then keep it simple.
 */

import type { Locale, MessageTree } from "../types";
import enUS from "./en-US";
import enGB from "./en-GB";
import enKE from "./en-KE";
import esES from "./es-ES";
import esMX from "./es-MX";
import frFR from "./fr-FR";
import deDE from "./de-DE";
import ptBR from "./pt-BR";
import arAE from "./ar-AE";
import swKE from "./sw-KE";
import hiIN from "./hi-IN";
import zhCN from "./zh-CN";
import jaJP from "./ja-JP";

export const LOCALE_BUNDLES: Record<Locale, MessageTree> = {
  "en-US": enUS,
  "en-GB": enGB,
  "en-KE": enKE,
  "es-ES": esES,
  "es-MX": esMX,
  "fr-FR": frFR,
  "de-DE": deDE,
  "pt-BR": ptBR,
  "ar-AE": arAE,
  "sw-KE": swKE,
  "hi-IN": hiIN,
  "zh-CN": zhCN,
  "ja-JP": jaJP
};

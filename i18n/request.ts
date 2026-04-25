import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("lang")?.value ?? "vi";
  const resolvedLocale = ["vi", "en"].includes(locale) ? locale : "vi";

  return {
    locale: resolvedLocale,
    messages: (await import(`@/lib/i18n/${resolvedLocale}.json`)).default,
  };
});

import { supabase } from "@/integrations/supabase/client";

// Invalida a sessao no servidor do Supabase (todos os dispositivos), limpa os
// cookies locais e volta para o login.
export async function signOutEverywhere() {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    /* mesmo com falha de rede, limpamos o lado local abaixo */
  }
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name.startsWith("sb-")) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
  window.location.assign("/login");
}

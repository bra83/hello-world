package com.braseiro.cyberpunkred;

import java.util.Collection;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/** Contrato nativo do seletor Kokoro, portado do Forbidden Lands (21/10/2026).
 * Independente de Android/Capacitor para permitir regressões com javac puro. */
public final class BraseiroAndroidTtsPolicy {
    public static final String RELEASE = "com.k2fsa.sherpa.onnx.tts.engine";
    public static final String DEBUG = "com.k2fsa.sherpa.onnx.tts.engine.debug";
    public static final String LEGACY = "com.braseiro.kokoro.ptbr";
    private BraseiroAndroidTtsPolicy() { }

    public static boolean isKokoro(String pkg) {
        return RELEASE.equals(pkg) || DEBUG.equals(pkg);
    }
    public static String preferredKokoro(Collection<String> installed) {
        if (installed.contains(RELEASE)) return RELEASE;
        if (installed.contains(DEBUG)) return DEBUG;
        return "";
    }
    public static List<String> selectable(Collection<String> found) {
        LinkedHashSet<String> real = new LinkedHashSet<>();
        for (String pkg : found) {
            if (pkg != null && !pkg.trim().isEmpty() && !LEGACY.equals(pkg.trim())) real.add(pkg.trim());
        }
        return new ArrayList<>(real);
    }
    /** Nunca trocar Google/Samsung por Kokoro. Corrigir somente alias legado
     * e migração release/debug quando a variante solicitada não está instalada. */
    public static String migrate(String selected, Collection<String> installed) {
        String pkg = selected == null ? "" : selected.trim();
        if (LEGACY.equals(pkg) || pkg.toLowerCase(java.util.Locale.ROOT).contains("db next")) {
            String replacement = preferredKokoro(installed);
            return replacement.isEmpty() ? pkg : replacement;
        }
        if (isKokoro(pkg) && !installed.contains(pkg)) {
            String replacement = preferredKokoro(installed);
            return replacement.isEmpty() ? pkg : replacement;
        }
        return pkg;
    }
    public static String modeForEngine(String pkg) {
        return isKokoro(pkg) ? "kokoro" : "android";
    }
}

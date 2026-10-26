package com.braseiro.cyberpunkred.dice;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Cyberpunk RED adapter for the mature Braseiro physical dice table.
 *
 * Physics owns only the observed top faces. Cyberpunk RED rules stay in the host:
 * Java reports physical faces -> the WebView host applies Year Zero / Cyberpunk RED rules.
 * No foreign RPG rule semantics cross this boundary.
 */
public final class BraseiroDice3DOverlay {
    private static final long WATCHDOG_MS = 27000L;
    private static final long RESULT_HOLD_MS = 780L;
    private static final AtomicReference<Runnable> ACTIVE_CANCEL = new AtomicReference<Runnable>();

    public interface Callback {
        void onResult(RollResult result);
        void onCancel();
        void onError(String message);
    }

    public static final class RollResult {
        public final String formula;
        public final ArrayList<Integer> rolls;
        public final ArrayList<Integer> physicalFaces;
        public final long seed;
        public final int physicsMs;
        public final boolean forcedSettle;
        public final String visualQuality;
        public final PhysicalDiceEngine.Session session;

        RollResult(String formula, List<Integer> rolls, List<Integer> physicalFaces,
                   long seed, int physicsMs, boolean forcedSettle, String visualQuality, PhysicalDiceEngine.Session session) {
            this.session=session;
            this.formula = formula;
            this.rolls = new ArrayList<Integer>(rolls);
            this.physicalFaces = new ArrayList<Integer>(physicalFaces);
            this.seed = seed;
            this.physicsMs = physicsMs;
            this.forcedSettle = forcedSettle;
            this.visualQuality = visualQuality;
        }
    }

    private BraseiroDice3DOverlay() {}

    public static void roll(final Activity activity, final String formula, final String material, final Callback callback) {
        roll(activity, formula, material, "ROLAGEM CYBERPUNK RED", "PLAYER_VISIBLE_MANUAL", callback, new SecureRandom().nextLong());
    }

    public static void roll(final Activity activity, final String formula, final String material,
                            final String reason, final String visibility, final Callback callback, final long seed) {
        if (callback == null) return;
        if (activity == null || activity.isFinishing() || (Build.VERSION.SDK_INT >= 17 && activity.isDestroyed())) {
            callback.onError("A tela foi encerrada antes da rolagem 3D.");
            return;
        }

        final DiceRollSpec spec;
        try {
            spec = DiceRollSpec.parse(formula, "Normal");
        } catch (Exception e) {
            callback.onError("Fórmula física inválida: " + safe(e.getMessage()));
            return;
        }
        if (!spec.supportsPhysical3d()) {
            callback.onError("A física 3D não suporta esta fórmula.");
            return;
        }


        final PhysicalDiceEngine.Session session;
        try {
            session = PhysicalDiceEngine.create(spec, seed);
        } catch (Exception e) {
            callback.onError("Não foi possível iniciar a física 3D: " + safe(e.getMessage()));
            return;
        }

        final Dialog dialog = new Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar_Fullscreen);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        final FrameLayout root = new FrameLayout(activity);
        root.setBackgroundColor(Color.rgb(5, 10, 9));


        final Dice3DView diceView = new Dice3DView(activity);
        diceView.setSession(session);
        root.addView(diceView, new FrameLayout.LayoutParams(-1, -1));

        final DiceAppearance appearance = cyberpunkAppearance(material);
        for (PhysicalDiceEngine.DieBody body : session.bodies) diceView.setAppearance(body.id, appearance);

        LinearLayout top = new LinearLayout(activity);
        top.setOrientation(LinearLayout.VERTICAL);
        top.setPadding(dp(activity, 18), dp(activity, 18), dp(activity, 18), dp(activity, 11));
        top.setBackgroundColor(Color.argb(172, 5, 14, 12));
        TextView heading = text(activity, "DADOS 3D — CYBERPUNK RED", 18, Color.rgb(216, 183, 126), true);
        String visibleReason = reason == null || reason.trim().isEmpty() ? "ROLAGEM CYBERPUNK RED" : reason.trim();
        TextView caption = text(activity, visibleReason + "  •  " + spec.formula + "  •  física real  •  face superior", 12, Color.rgb(216, 199, 168), false);
        top.addView(heading);
        top.addView(caption);
        root.addView(top, new FrameLayout.LayoutParams(-1, -2, Gravity.TOP));

        final LinearLayout bottom = new LinearLayout(activity);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(dp(activity, 18), dp(activity, 12), dp(activity, 18), dp(activity, 18));
        bottom.setBackgroundColor(Color.argb(188, 5, 14, 12));
        final TextView result = text(activity, "Dados em movimento…", 20, Color.rgb(232, 209, 165), true);
        result.setGravity(Gravity.CENTER);
        final TextView detail = text(activity, "gravidade • impulso • colisões • assentamento", 12, Color.rgb(170, 145, 104), false);
        detail.setGravity(Gravity.CENTER);
        final Button cancel = button(activity, "CANCELAR ROLAGEM");
        bottom.addView(result);
        bottom.addView(detail);
        bottom.addView(cancel);
        root.addView(bottom, new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM));

        dialog.setContentView(root);
        dialog.setCancelable(false);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
            Insets safe = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());
            top.setPadding(dp(activity, 18), dp(activity, 18) + safe.top,
                    dp(activity, 18), dp(activity, 11));
            bottom.setPadding(dp(activity, 18), dp(activity, 12),
                    dp(activity, 18), dp(activity, 18) + safe.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(root);

        final Handler main = new Handler(Looper.getMainLooper());
        final AtomicBoolean terminal = new AtomicBoolean(false);
        final AtomicBoolean settled = new AtomicBoolean(false);
        final Runnable[] cancelHolder = new Runnable[1];
        final long[] lastNs = {System.nanoTime()};
        final double[] accumulator = {0};

        final Runnable watchdog = new Runnable() {
            @Override public void run() {
                if (!terminal.compareAndSet(false, true)) return;
                ACTIVE_CANCEL.compareAndSet(cancelHolder[0], null);
                dismiss(dialog);
                callback.onError("A física 3D excedeu o limite de segurança; nenhum resultado foi registrado.");
            }
        };

        final Runnable publish = new Runnable() {
            @Override public void run() {
                if (!settled.get() || !terminal.compareAndSet(false, true)) return;
                main.removeCallbacks(watchdog);
                try {
                    PhysicalDiceEngine.RollResult raw = session.result();
                    if (raw == null) throw new IllegalStateException("resultado físico ausente");
                    List<Integer> canonical = spec.requirePhysicalAgreement(raw.dice, raw.physicalFaces);
                    int physicsMs = (int) Math.max(0, Math.min(60000,
                            Math.round(raw.physicsSteps * PhysicalDiceEngine.FIXED_DT * 1000.0)));
                    String quality = diceView.visualQualityLabel();
                    ACTIVE_CANCEL.compareAndSet(cancelHolder[0], null);
                    dismiss(dialog);
                    callback.onResult(new RollResult(spec.formula, canonical, raw.physicalFaces, seed,
                            physicsMs, raw.forcedSettle, quality, session));
                } catch (Exception e) {
                    dismiss(dialog);
                    callback.onError("Resultado físico inválido e descartado: " + safe(e.getMessage()));
                }
            }
        };

        final Runnable ticker = new Runnable() {
            @Override public void run() {
                if (terminal.get() || settled.get() || !dialog.isShowing()) return;
                long now = System.nanoTime();
                double elapsed = Math.min(.055, (now - lastNs[0]) / 1e9);
                lastNs[0] = now;
                accumulator[0] += elapsed;
                int sub = 0;
                while (accumulator[0] >= PhysicalDiceEngine.FIXED_DT && sub < 8 && !session.isComplete()) {
                    session.step();
                    accumulator[0] -= PhysicalDiceEngine.FIXED_DT;
                    sub++;
                }

                diceView.invalidate();

                if (session.isComplete()) {
                    settled.set(true);
                    main.removeCallbacks(watchdog);
                    try {
                        PhysicalDiceEngine.RollResult raw = session.result();
                        if (raw == null) throw new IllegalStateException("resultado físico ausente");
                        List<Integer> faces = spec.requirePhysicalAgreement(raw.dice, raw.physicalFaces);
                        if (faces.size() == 1) result.setText("FACE  " + faces.get(0));
                        else result.setText("FACES  " + join(faces, "  •  "));
                        detail.setText((raw.forcedSettle ? "assentamento de segurança • " : "")
                                + "física 120 Hz • gráfico " + diceView.visualQualityLabel());
                        cancel.setText("DESCARTAR");
                        main.postDelayed(publish, RESULT_HOLD_MS);
                    } catch (Exception e) {
                        if (terminal.compareAndSet(false, true)) {
                            ACTIVE_CANCEL.compareAndSet(cancelHolder[0], null);
                            dismiss(dialog);
                            callback.onError("Resultado físico inválido e descartado: " + safe(e.getMessage()));
                        }
                    }
                    return;
                }
                diceView.postOnAnimation(this);
            }
        };

        cancel.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                if (!terminal.compareAndSet(false, true)) return;
                ACTIVE_CANCEL.compareAndSet(cancelHolder[0], null);
                main.removeCallbacks(watchdog);
                main.removeCallbacks(publish);
                dismiss(dialog);
                callback.onCancel();
            }
        });
        cancelHolder[0] = new Runnable() {
            @Override public void run() {
                if (!terminal.compareAndSet(false, true)) return;
                ACTIVE_CANCEL.compareAndSet(cancelHolder[0], null);
                main.removeCallbacks(watchdog);
                main.removeCallbacks(publish);
                dismiss(dialog);
                callback.onCancel();
            }
        };
        ACTIVE_CANCEL.set(cancelHolder[0]);
        dialog.setOnKeyListener((d, keyCode, event) -> {
            if (keyCode == KeyEvent.KEYCODE_BACK && event != null && event.getAction() == KeyEvent.ACTION_UP) {
                cancelHolder[0].run();
                return true;
            }
            return false;
        });
        dialog.setOnDismissListener(d -> {
            main.removeCallbacks(watchdog);
            main.removeCallbacks(publish);
            if (!terminal.get() && cancelHolder[0] != null) cancelHolder[0].run();
        });
        dialog.setOnShowListener(d -> {
            Window w = dialog.getWindow();
            if (w != null) w.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
            lastNs[0] = System.nanoTime();
            main.postDelayed(watchdog, WATCHDOG_MS);
            diceView.postOnAnimation(ticker);
        });
        dialog.show();

        Window w = dialog.getWindow();
        if (w != null) {
            w.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            w.setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
            w.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.dimAmount = .22f;
            w.setAttributes(lp);
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.BLACK);
        }
    }

    public static void cancelActive() {
        Runnable cancel = ACTIVE_CANCEL.getAndSet(null);
        if (cancel != null) cancel.run();
    }

    private static DiceAppearance cyberpunkAppearance(String raw) {
        String material = raw == null ? "stone" : raw.trim().toLowerCase();
        if (!(material.equals("ivory") || material.equals("bone") || material.equals("obsidian")
                || material.equals("wood") || material.equals("stone") || material.equals("metal"))) {
            material = "stone";
        }
        DiceAppearance d = DiceAppearance.preset(material);
        d.baseColor = Color.rgb(100, 20, 32);
        d.numberColor = Color.rgb(246, 243, 232);
        d.edgeColor = Color.rgb(210, 65, 78);
        d.shine = .18f;
        d.wear = .14f;
        d.edgeWidth = 1.05f;
        d.pattern = "grain";
        return d;
    }

    private static TextView text(Activity a, String s, int sp, int color, boolean bold) {
        TextView t = new TextView(a);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.SERIF, Typeface.BOLD);
        t.setPadding(0, dp(a, 4), 0, dp(a, 4));
        return t;
    }

    private static Button button(Activity a, String s) {
        Button b = new Button(a);
        b.setText(s);
        b.setTextColor(Color.rgb(232, 209, 165));
        b.setBackgroundColor(Color.rgb(58, 43, 24));
        b.setMinHeight(dp(a, 50));
        return b;
    }

    private static int dp(Activity a, int value) {
        return Math.round(value * a.getResources().getDisplayMetrics().density);
    }

    private static String join(List<Integer> values, String separator) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) b.append(separator);
            b.append(values.get(i));
        }
        return b.toString();
    }

    private static String safe(String s) { return s == null ? "" : s; }

    private static void dismiss(Dialog d) {
        try { if (d != null && d.isShowing()) d.dismiss(); } catch (Exception ignored) { }
    }
}


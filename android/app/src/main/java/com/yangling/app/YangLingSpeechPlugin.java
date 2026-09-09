package com.yangling.app;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Locale;

@CapacitorPlugin(name = "YangLingSpeech")
public class YangLingSpeechPlugin extends Plugin {
    private TextToSpeech engine;
    private boolean ready = false;
    private boolean failed = false;
    private PluginCall pending;
    private String utteranceId;
    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            engine = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                ready = status == TextToSpeech.SUCCESS;
                if (ready) {
                    int language = engine.setLanguage(Locale.SIMPLIFIED_CHINESE);
                    ready = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED;
                    engine.setSpeechRate(0.9f);
                }
                failed = !ready;
                if (pending != null) { if (ready) begin(); else finish(false); }
            }));
            engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { completed(id, true); }
                @Override public void onError(String id) { completed(id, false); }
                @Override public void onStop(String id, boolean interrupted) { completed(id, true); }
            });
        });
    }
    private void completed(String id, boolean ok) {
        getActivity().runOnUiThread(() -> { if (id.equals(utteranceId)) finish(ok); });
    }
    private void finish(boolean ok) {
        PluginCall call = pending; pending = null; utteranceId = null;
        if (call != null) { if (ok) call.resolve(); else call.reject("Chinese speech engine unavailable"); }
    }
    private void begin() {
        utteranceId = "yangling-" + System.nanoTime();
        if (engine.speak(pending.getString("text", ""), TextToSpeech.QUEUE_FLUSH, null, utteranceId) == TextToSpeech.ERROR) finish(false);
    }
    @PluginMethod public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (engine != null) engine.stop(); finish(true);
            if (failed) { call.reject("Chinese speech engine unavailable"); return; }
            pending = call; if (ready) begin();
        });
    }
    @PluginMethod public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (engine != null) engine.stop(); finish(true); call.resolve(); });
    }
    @Override protected void handleOnPause() { if (engine != null) engine.stop(); finish(true); }
    @Override protected void handleOnDestroy() { if (engine != null) { engine.stop(); engine.shutdown(); } finish(true); }
}

package com.yangling.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(DeviceSettingsPlugin.class);
        super.onCreate(state);
    }
}

package com.gmtxll.diettrainingledger;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class);
        registerPlugin(VoiceCoachPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

package __PACKAGE__;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Zona e sigurt: faqja nuk shkon nën shiritin e orës lart dhe nën shiritin Back/Home poshtë (edhe në Android 15,
 * që detyron "edge-to-edge"). Capacitor i jep WebView-it kufijtë e shiritave (android.adjustMarginsForEdgeToEdge =
 * "force" te capacitor.config.json); këtu shiritat marrin ngjyrën e errët të programit, me ikona të bardha.
 */
public class MainActivity extends BridgeActivity {
    private static final int BACKGROUND = Color.parseColor("#16191E");

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AstFilesPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(BACKGROUND);
        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
    }
}

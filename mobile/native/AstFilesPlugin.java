package __PACKAGE__;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/**
 * Ruajtja e skedarëve në Android: hap dritaren e sistemit "Ruaj si" (zgjedhja e dosjes dhe e emrit)
 * dhe shkruan aty bajtët që i dërgon faqja si base64 (src/io/files.ts → saveAndroid).
 */
@CapacitorPlugin(name = "AstFiles")
public class AstFilesPlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        if (call.getString("data") == null) {
            call.reject("Mungojnë të dhënat e skedarit");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mime", "application/octet-stream"));
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("filename", "projekt.json"));
        startActivityForResult(call, intent, "saveResult");
    }

    /** Versioni i instaluar (versionName), për përditësimin (src/io/androidUpdate.ts). */
    @PluginMethod
    public void info(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            PackageInfo p = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            ret.put("version", p.versionName);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Versioni nuk u lexua", e);
        }
    }

    /**
     * Identifikuesi i qëndrueshëm i pajisjes për provën falas (Settings.Secure.ANDROID_ID, i njëjti që jep
     * Device.getId() i @capacitor/device). Faqja e kthen në SHA-256 (src/license/trial.ts); çinstalimi s'e ndryshon.
     */
    @PluginMethod
    public void deviceId(PluginCall call) {
        String id = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ANDROID_ID);
        if (id == null || id.isEmpty()) {
            call.reject("Pajisja nuk u identifikua");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("identifier", id);
        ret.put("id", id);
        call.resolve(ret);
    }

    /** Hap një lidhje https në shfletues (shkarkimi i APK-së së re). */
    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://")) {
            call.reject("Lidhje e pavlefshme");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            out.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            ret.put("saved", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Skedari nuk u ruajt", e);
        }
    }
}

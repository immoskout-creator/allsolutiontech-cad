package __PACKAGE__;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
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

package com.bettingapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.io.File;

public class ApkInstallerModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    ApkInstallerModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "ApkInstaller";
    }

    @ReactMethod
    public void install(String filePath, Promise promise) {
        try {
            File file = new File(filePath);
            
            if (!file.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found: " + filePath);
                return;
            }

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                // Android 7.0+: Use FileProvider
                apkUri = FileProvider.getUriForFile(
                    reactContext,
                    reactContext.getPackageName() + ".fileprovider",
                    file
                );
            } else {
                // Older Android: Direct file URI
                apkUri = Uri.fromFile(file);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            
            getCurrentActivity().startActivity(intent);
            promise.resolve("Installer opened successfully");
            
        } catch (Exception e) {
            promise.reject("INSTALL_ERROR", "Failed to open installer: " + e.getMessage());
        }
    }
}


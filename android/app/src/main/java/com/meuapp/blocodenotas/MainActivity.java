package com.meuapp.blocodenotas;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

public class MainActivity extends BridgeActivity {

    private static final int STORAGE_PERMISSION_CODE = 2001;
    private static final int MICROPHONE_PERMISSION_CODE = 2002;
    private static final int ALL_PERMISSIONS_CODE = 2003;
    private String pendingFileJson = null;
    private String lastProcessedUriString = null;
    private long lastProcessedTimestamp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initFileBridge();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    public boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Build.VERSION.SDK_INT <= 32) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    public void requestStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Build.VERSION.SDK_INT <= 32) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                }, STORAGE_PERMISSION_CODE);
            }
        }
    }

    public boolean hasMicrophonePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    public void requestMicrophonePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.RECORD_AUDIO
                }, MICROPHONE_PERMISSION_CODE);
            }
        }
    }

    public void requestAllAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.List<String> needed = new java.util.ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.RECORD_AUDIO);
            }
            if (Build.VERSION.SDK_INT <= 32) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                    needed.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
                }
            }
            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), ALL_PERMISSIONS_CODE);
            }
        }
    }

    private void initFileBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getPendingFile() {
                    String data = pendingFileJson;
                    pendingFileJson = null;
                    return data;
                }

                @JavascriptInterface
                public void markFileHandled(String intentId) {
                    pendingFileJson = null;
                }

                @JavascriptInterface
                public boolean hasStoragePermission() {
                    return MainActivity.this.hasStoragePermission();
                }

                @JavascriptInterface
                public void requestStoragePermission() {
                    runOnUiThread(() -> {
                        MainActivity.this.requestStoragePermission();
                    });
                }

                @JavascriptInterface
                public boolean hasMicrophonePermission() {
                    return MainActivity.this.hasMicrophonePermission();
                }

                @JavascriptInterface
                public void requestMicrophonePermission() {
                    runOnUiThread(() -> {
                        MainActivity.this.requestMicrophonePermission();
                    });
                }

                @JavascriptInterface
                public void requestAllAppPermissions() {
                    runOnUiThread(() -> {
                        MainActivity.this.requestAllAppPermissions();
                    });
                }
            }, "AndroidFileBridge");
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) || Intent.ACTION_EDIT.equals(action)) {
            Uri uri = intent.getData();
            if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
                uri = intent.getClipData().getItemAt(0).getUri();
            }
            if (uri != null) {
                String uriStr = uri.toString();
                long now = System.currentTimeMillis();
                if (uriStr.equals(lastProcessedUriString) && (now - lastProcessedTimestamp) < 1500) {
                    return;
                }
                lastProcessedUriString = uriStr;
                lastProcessedTimestamp = now;

                processFileUri(uri);
            }
        } else if (Intent.ACTION_SEND.equals(action)) {
            if (intent.hasExtra(Intent.EXTRA_STREAM)) {
                try {
                    Uri uri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                    if (uri != null) {
                        String uriStr = uri.toString();
                        long now = System.currentTimeMillis();
                        if (uriStr.equals(lastProcessedUriString) && (now - lastProcessedTimestamp) < 1500) {
                            return;
                        }
                        lastProcessedUriString = uriStr;
                        lastProcessedTimestamp = now;

                        processFileUri(uri);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            } else if (intent.hasExtra(Intent.EXTRA_TEXT)) {
                String text = intent.getStringExtra(Intent.EXTRA_TEXT);
                String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
                String fileName = (subject != null && !subject.trim().isEmpty()) ? subject : "nota-compartilhada.txt";
                if (text != null) {
                    deliverFileData(fileName, text);
                }
            }
        }
    }

    private void processFileUri(Uri uri) {
        String fileName = getFileName(uri);
        String content = readFileContent(uri);
        if (content != null) {
            deliverFileData(fileName, content);
        }
    }

    private void deliverFileData(String fileName, String content) {
        try {
            String intentId = UUID.randomUUID().toString();
            JSONObject obj = new JSONObject();
            obj.put("id", intentId);
            obj.put("fileName", fileName);
            obj.put("content", content);
            this.pendingFileJson = obj.toString();

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(() -> {
                    String escapedFileName = JSONObject.quote(fileName);
                    String escapedContent = JSONObject.quote(content);
                    String escapedId = JSONObject.quote(intentId);
                    String js = "if (typeof window.__onAndroidFileOpen === 'function') { window.__onAndroidFileOpen(" 
                        + escapedFileName + ", " 
                        + escapedContent + ", " 
                        + escapedId + "); }";
                    bridge.getWebView().evaluateJavascript(js, null);
                });
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private String getFileName(Uri uri) {
        String result = "nota.txt";
        if (uri == null) return result;
        if ("content".equalsIgnoreCase(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        String name = cursor.getString(nameIndex);
                        if (name != null && !name.trim().isEmpty()) {
                            result = name;
                        }
                    }
                }
            } catch (Exception ignored) {}
        } else if ("file".equalsIgnoreCase(uri.getScheme())) {
            if (uri.getLastPathSegment() != null) {
                result = uri.getLastPathSegment();
            }
        }
        return result;
    }

    private String readFileContent(Uri uri) {
        try (InputStream is = getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            try (InputStream is = getContentResolver().openInputStream(uri);
                 BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.ISO_8859_1))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                return sb.toString();
            } catch (Exception ex) {
                ex.printStackTrace();
                return null;
            }
        }
    }
}

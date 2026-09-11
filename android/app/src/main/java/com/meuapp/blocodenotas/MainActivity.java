package com.meuapp.blocodenotas;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private String pendingFileJson = null;

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

    private void initFileBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getPendingFile() {
                    String data = pendingFileJson;
                    pendingFileJson = null;
                    return data;
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
                processFileUri(uri);
            }
        } else if (Intent.ACTION_SEND.equals(action)) {
            if (intent.hasExtra(Intent.EXTRA_STREAM)) {
                try {
                    Uri uri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                    if (uri != null) {
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
            JSONObject obj = new JSONObject();
            obj.put("fileName", fileName);
            obj.put("content", content);
            this.pendingFileJson = obj.toString();

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(() -> {
                    String escapedFileName = JSONObject.quote(fileName);
                    String escapedContent = JSONObject.quote(content);
                    String js = "if (window.__onAndroidFileOpen) { window.__onAndroidFileOpen(" + escapedFileName + ", " + escapedContent + "); }";
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

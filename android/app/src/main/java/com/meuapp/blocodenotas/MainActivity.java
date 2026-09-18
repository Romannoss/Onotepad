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
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

public class MainActivity extends BridgeActivity {

    private static final int STORAGE_PERMISSION_CODE = 2001;
    private static final int MICROPHONE_PERMISSION_CODE = 2002;
    private static final int ALL_PERMISSIONS_CODE = 2003;
    private static final int REQUEST_OPEN_FILE_CODE = 4501;
    private String pendingFileJson = null;
    private String lastProcessedUriString = null;
    private long lastProcessedTimestamp = 0;
    private TextToSpeech tts = null;
    private boolean isTtsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initTextToSpeech();
        initFileBridge();
        handleIntent(getIntent());
    }

    private void initTextToSpeech() {
        try {
            tts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    try {
                        int res = tts.setLanguage(new Locale("pt", "BR"));
                        if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                            tts.setLanguage(Locale.getDefault());
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    isTtsReady = true;

                    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override
                        public void onStart(String utteranceId) {
                            runOnUiThread(() -> {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript("if (typeof window.__onNativeSpeechStart === 'function') window.__onNativeSpeechStart();", null);
                                }
                            });
                        }

                        @Override
                        public void onDone(String utteranceId) {
                            runOnUiThread(() -> {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript("if (typeof window.__onNativeSpeechEnd === 'function') window.__onNativeSpeechEnd();", null);
                                }
                            });
                        }

                        @Override
                        public void onError(String utteranceId) {
                            runOnUiThread(() -> {
                                if (bridge != null && bridge.getWebView() != null) {
                                    bridge.getWebView().evaluateJavascript("if (typeof window.__onNativeSpeechEnd === 'function') window.__onNativeSpeechEnd();", null);
                                }
                            });
                        }
                    });
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
        }
        super.onDestroy();
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

                @JavascriptInterface
                public void openFilePicker() {
                    runOnUiThread(() -> {
                        MainActivity.this.launchOpenFilePicker();
                    });
                }

                @JavascriptInterface
                public boolean isNativeTtsAvailable() {
                    return isTtsReady && tts != null;
                }

                @JavascriptInterface
                public void speakText(String text, float rate) {
                    if (tts != null && isTtsReady && text != null && !text.trim().isEmpty()) {
                        runOnUiThread(() -> {
                            try {
                                tts.stop();
                                tts.setSpeechRate(rate > 0 ? rate : 1.0f);
                                Bundle params = new Bundle();
                                params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, "NOTE_VOICE_" + System.currentTimeMillis());
                                tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, "NOTE_VOICE");
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }

                @JavascriptInterface
                public void stopSpeech() {
                    if (tts != null) {
                        runOnUiThread(() -> {
                            try {
                                tts.stop();
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        });
                    }
                }
            }, "AndroidFileBridge");
        }
    }

    public void launchOpenFilePicker() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        String[] mimeTypes = new String[]{
            "text/plain",
            "text/*",
            "application/octet-stream",
            "application/x-empty"
        };
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        try {
            startActivityForResult(intent, REQUEST_OPEN_FILE_CODE);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Intent.ACTION_GET_CONTENT);
                fallback.addCategory(Intent.CATEGORY_OPENABLE);
                fallback.setType("*/*");
                fallback.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
                startActivityForResult(Intent.createChooser(fallback, "Abrir nota (.txt)"), REQUEST_OPEN_FILE_CODE);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_OPEN_FILE_CODE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri == null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                uri = data.getClipData().getItemAt(0).getUri();
            }
            if (uri != null) {
                try {
                    getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (Exception ignored) {}
                processFileUri(uri);
            }
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
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            if (is == null) return null;
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) != -1) {
                baos.write(buffer, 0, read);
            }
            byte[] bytes = baos.toByteArray();
            try {
                CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder();
                return decoder.decode(ByteBuffer.wrap(bytes)).toString();
            } catch (Exception e) {
                return new String(bytes, StandardCharsets.ISO_8859_1);
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}

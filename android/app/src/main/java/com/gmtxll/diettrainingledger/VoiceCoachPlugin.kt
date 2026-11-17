package com.gmtxll.diettrainingledger

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.util.Locale

@CapacitorPlugin(
    name = "VoiceCoach",
    permissions = [Permission(alias = "microphone", strings = [Manifest.permission.RECORD_AUDIO])]
)
class VoiceCoachPlugin : Plugin(), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var recognizer: SpeechRecognizer? = null

    override fun load() {
        tts = TextToSpeech(context, this)
    }

    override fun handleOnDestroy() {
        recognizer?.destroy()
        tts?.shutdown()
        super.handleOnDestroy()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.SIMPLIFIED_CHINESE
        }
    }

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text")?.trim()
        if (text.isNullOrBlank()) {
            call.reject("缺少播报内容")
            return
        }
        activity.runOnUiThread {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "workout-coach")
            call.resolve()
        }
    }

    @PluginMethod
    fun startListening(call: PluginCall) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "onMicrophonePermission")
            return
        }
        beginListening(call)
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val available = SpeechRecognizer.isRecognitionAvailable(context)
        val onDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        call.resolve(
            JSObject()
                .put("available", available)
                .put("onDeviceAvailable", onDevice)
                .put("microphoneGranted", getPermissionState("microphone") == PermissionState.GRANTED)
        )
    }

    @PluginMethod
    fun stopListening(call: PluginCall) {
        activity.runOnUiThread {
            recognizer?.cancel()
            call.resolve()
        }
    }

    @PermissionCallback
    private fun onMicrophonePermission(call: PluginCall) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) beginListening(call)
        else call.reject("需要麦克风权限才能使用语音控制")
    }

    private fun beginListening(call: PluginCall) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            call.reject("当前设备未提供语音识别服务")
            return
        }
        activity.runOnUiThread {
            recognizer?.destroy()
            recognizer = try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
                    SpeechRecognizer.createOnDeviceSpeechRecognizer(context)
                } else SpeechRecognizer.createSpeechRecognizer(context)
            } catch (error: Exception) {
                call.reject("语音识别引擎启动失败：${error.message ?: "未知错误"}")
                return@runOnUiThread
            }.apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) { notifyListeners("listening", JSObject().put("active", true)) }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {}
                    override fun onError(error: Int) {
                        notifyListeners("listening", JSObject().put("active", false))
                        val message = when (error) {
                            SpeechRecognizer.ERROR_AUDIO -> "麦克风不可用，请检查麦克风权限或是否被其他应用占用"
                            SpeechRecognizer.ERROR_CLIENT -> "语音识别已中断，请重新点击语音控制"
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "缺少麦克风权限，请在系统设置中允许"
                            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "语音识别服务需要网络，请检查网络或安装离线语音包"
                            SpeechRecognizer.ERROR_NO_MATCH -> "没有识别到口令，请说“下一项”"
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "语音识别服务正忙，请稍后再试"
                            SpeechRecognizer.ERROR_SERVER -> "语音识别服务暂不可用"
                            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "未检测到说话，请再试一次"
                            else -> "语音识别失败（代码 $error）"
                        }
                        val retryable = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                        notifyListeners("error", JSObject().put("message", message).put("retryable", retryable).put("code", error))
                    }
                    override fun onResults(results: Bundle?) {
                        val words = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                        if (words.isBlank()) notifyListeners("error", JSObject().put("message", "没有识别到口令，请再试一次").put("retryable", true))
                        else notifyListeners("result", JSObject().put("text", words))
                        notifyListeners("listening", JSObject().put("active", false))
                    }
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "zh-CN")
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                    putExtra(RecognizerIntent.EXTRA_PROMPT, "请说：下一项、开始、暂停或结束训练")
                }
                startListening(intent)
            }
            call.resolve()
        }
    }
}

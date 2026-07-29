package com.sonkkeut.app.widget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.Executors

class ALineWidgetModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val executor = Executors.newSingleThreadExecutor()

  override fun getName(): String = "ALineWidget"

  @ReactMethod
  fun updateLatestPost(imageUrl: String, author: String, time: String, promise: Promise) {
    executor.execute {
      try {
        WidgetStorage.update(reactContext, imageUrl, author, time)
        ALineWidgetProvider.updateAll(reactContext)
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("WIDGET_UPDATE_FAILED", error.message, error)
      }
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    executor.execute {
      try {
        WidgetStorage.clear(reactContext)
        ALineWidgetProvider.updateAll(reactContext)
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("WIDGET_CLEAR_FAILED", error.message, error)
      }
    }
  }
}

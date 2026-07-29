package com.sonkkeut.app.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

internal object WidgetStorage {
  private const val PREFS_NAME = "aline_widget"
  private const val IMAGE_NAME = "latest_post.jpg"
  private const val TARGET_SIZE = 720

  data class Snapshot(
    val hasPost: Boolean,
    val author: String,
    val time: String,
    val imageFile: File,
  )

  fun read(context: Context): Snapshot {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return Snapshot(
      hasPost = prefs.getBoolean("has_post", false),
      author = prefs.getString("author", "") ?: "",
      time = prefs.getString("time", "") ?: "",
      imageFile = imageFile(context),
    )
  }

  fun update(context: Context, imageUrl: String, author: String, time: String) {
    val bitmap = loadBitmap(context, imageUrl)
      ?: throw IllegalArgumentException("Widget image could not be decoded")
    val square = cropSquare(bitmap)
    if (square !== bitmap) bitmap.recycle()

    val target = imageFile(context)
    val temporary = File(target.parentFile, "$IMAGE_NAME.tmp")
    FileOutputStream(temporary).use { output ->
      if (!square.compress(Bitmap.CompressFormat.JPEG, 88, output)) {
        throw IllegalStateException("Widget image could not be saved")
      }
    }
    square.recycle()

    if (target.exists() && !target.delete()) {
      temporary.delete()
      throw IllegalStateException("Previous widget image could not be replaced")
    }
    if (!temporary.renameTo(target)) {
      temporary.delete()
      throw IllegalStateException("Widget image could not be committed")
    }

    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean("has_post", true)
      .putString("author", author)
      .putString("time", time)
      .apply()
  }

  fun clear(context: Context) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    imageFile(context).delete()
  }

  private fun imageFile(context: Context): File {
    val directory = File(context.filesDir, "widget").apply { mkdirs() }
    return File(directory, IMAGE_NAME)
  }

  private fun loadBitmap(context: Context, source: String): Bitmap? {
    if (source.startsWith("data:image")) {
      val encoded = source.substringAfter(',', "")
      if (encoded.isEmpty()) return null
      val bytes = Base64.decode(encoded, Base64.DEFAULT)
      return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }

    val uri = Uri.parse(source)
    if (uri.scheme == "file" || uri.scheme == "content") {
      return context.contentResolver.openInputStream(uri)?.use(BitmapFactory::decodeStream)
    }

    val connection = URL(source).openConnection() as HttpURLConnection
    return try {
      connection.connectTimeout = 10_000
      connection.readTimeout = 15_000
      connection.instanceFollowRedirects = true
      connection.doInput = true
      connection.connect()
      if (connection.responseCode !in 200..299) return null
      connection.inputStream.use(BitmapFactory::decodeStream)
    } finally {
      connection.disconnect()
    }
  }

  private fun cropSquare(source: Bitmap): Bitmap {
    val side = minOf(source.width, source.height)
    val left = (source.width - side) / 2
    val top = (source.height - side) / 2
    val cropped = Bitmap.createBitmap(source, left, top, side, side)
    val scaled = Bitmap.createScaledBitmap(cropped, TARGET_SIZE, TARGET_SIZE, true)
    if (cropped !== source && cropped !== scaled) cropped.recycle()
    return scaled
  }
}

package com.sonkkeut.app.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.sonkkeut.app.MainActivity
import com.sonkkeut.app.R

class ALineWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    render(context, appWidgetManager, appWidgetIds)
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, ALineWidgetProvider::class.java)
      render(context, manager, manager.getAppWidgetIds(component))
    }

    private fun render(
      context: Context,
      manager: AppWidgetManager,
      widgetIds: IntArray,
    ) {
      if (widgetIds.isEmpty()) return
      val snapshot = WidgetStorage.read(context)
      val hasPost = snapshot.hasPost && snapshot.imageFile.exists()
      val launchCamera = PendingIntent.getActivity(
        context,
        4101,
        Intent(Intent.ACTION_VIEW, Uri.parse("aline://app/camera"), context, MainActivity::class.java)
          .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

      widgetIds.forEach { widgetId ->
        val views = RemoteViews(context.packageName, R.layout.aline_widget)
        views.setOnClickPendingIntent(R.id.aline_widget_root, launchCamera)
        views.setOnClickPendingIntent(R.id.aline_widget_camera, launchCamera)
        views.setViewVisibility(R.id.aline_widget_photo, if (hasPost) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.aline_widget_scrim, if (hasPost) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.aline_widget_meta, if (hasPost) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.aline_widget_empty, if (hasPost) View.GONE else View.VISIBLE)

        if (hasPost) {
          views.setImageViewBitmap(
            R.id.aline_widget_photo,
            BitmapFactory.decodeFile(snapshot.imageFile.absolutePath),
          )
          views.setTextViewText(R.id.aline_widget_author, snapshot.author)
          views.setTextViewText(R.id.aline_widget_time, snapshot.time)
        }
        manager.updateAppWidget(widgetId, views)
      }
    }
  }
}

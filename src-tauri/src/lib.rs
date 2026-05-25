// use tauri::Manager; // Removed unused import
use tauri_plugin_store::StoreExt;
use serde_json::json;
use std::collections::HashMap;


#[tauri::command]
async fn get_credential(app: tauri::AppHandle, key: String) -> Result<String, String> {
    let stores = app.store("credentials.json").map_err(|e| e.to_string())?;
    let val = stores.get(key).unwrap_or(json!(""));
    Ok(val.as_str().unwrap_or("").to_string())
}

#[tauri::command]
async fn set_credential(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let stores = app.store("credentials.json").map_err(|e| e.to_string())?;
    stores.set(key, json!(value));
    stores.save().map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_credential(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let stores = app.store("credentials.json").map_err(|e| e.to_string())?;
    stores.delete(key);
    stores.save().map_err(|e| e.to_string())
}

#[tauri::command]
async fn migrate_credential(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let stores = app.store("credentials.json").map_err(|e| e.to_string())?;
    if stores.get(&key).is_none() {
        stores.set(key, json!(value));
        stores.save().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Custom HTTP fetch command that routes through a native reqwest client.
///
/// Bypasses Tauri's default HTTP plugin SSL restrictions so corporate proxies
/// that perform SSL inspection (self-signed certificates) do not cause
/// network errors. Also naturally inherits system proxy env vars
/// (HTTP_PROXY, HTTPS_PROXY, NO_PROXY) from the host OS environment.
#[tauri::command]
async fn custom_fetch(
    method: String,
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .use_native_tls()
        .build()
        .map_err(|e| e.to_string())?;

    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|e| e.to_string())?;

    let mut request = client.request(method, &url);

    if let Some(hdrs) = headers {
        for (key, value) in hdrs {
            request = request.header(&key, &value);
        }
    }

    if let Some(b) = body {
        request = request.body(b);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let text = response.text().await.map_err(|e| e.to_string())?;

    Ok(json!({
        "status": status,
        "ok": ok,
        "body": text,
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "linux")]
  {
      // Fix for white screen in VMs and some Linux environments
      std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_credential,
        set_credential,
        delete_credential,
        migrate_credential,
        custom_fetch
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

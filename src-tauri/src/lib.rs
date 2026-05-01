// use tauri::Manager; // Removed unused import
use tauri_plugin_store::StoreExt;
use serde_json::json;


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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_shell::init())
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
        migrate_credential
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

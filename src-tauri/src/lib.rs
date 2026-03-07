use tauri::Manager;
use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            let handle = app.handle();

            // --- Menu Creation ---
            
            // 1. App Menu (macOS only really matters for the first item, but good practice)
            let app_menu = Submenu::with_items(
                handle,
                "Textura",
                true,
                &[
                    &PredefinedMenuItem::about(handle, Some("关于 Textura"), None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::hide(handle, Some("隐藏 Textura"))?,
                    &PredefinedMenuItem::hide_others(handle, Some("隐藏其他"))?,
                    &PredefinedMenuItem::show_all(handle, Some("显示全部"))?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::quit(handle, Some("退出 Textura"))?,
                ],
            )?;

            // 2. File Menu
            let file_menu = Submenu::with_items(
                handle,
                "文件",
                true,
                &[
                    &PredefinedMenuItem::close_window(handle, Some("关闭窗口"))?,
                ],
            )?;

            // 3. Edit Menu
            let edit_menu = Submenu::with_items(
                handle,
                "编辑",
                true,
                &[
                    &PredefinedMenuItem::undo(handle, Some("撤销"))?,
                    &PredefinedMenuItem::redo(handle, Some("重做"))?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::cut(handle, Some("剪切"))?,
                    &PredefinedMenuItem::copy(handle, Some("复制"))?,
                    &PredefinedMenuItem::paste(handle, Some("粘贴"))?,
                    &PredefinedMenuItem::select_all(handle, Some("全选"))?,
                ],
            )?;

            // 4. Format Menu (Custom)
            let bold = MenuItem::with_id(handle, "format_bold", "加粗", true, Some("CmdOrCtrl+B"))?;
            let italic = MenuItem::with_id(handle, "format_italic", "斜体", true, Some("CmdOrCtrl+I"))?;
            let strike = MenuItem::with_id(handle, "format_strike", "删除线", true, Some("CmdOrCtrl+D"))?;
            let link = MenuItem::with_id(handle, "format_link", "超链接", true, Some("CmdOrCtrl+K"))?;
            let code = MenuItem::with_id(handle, "format_code", "行内代码", true, Some("CmdOrCtrl+E"))?;
            
            // Headings Submenu
            let h1 = MenuItem::with_id(handle, "format_h1", "H1 标题", true, Some("CmdOrCtrl+1"))?;
            let h2 = MenuItem::with_id(handle, "format_h2", "H2 标题", true, Some("CmdOrCtrl+2"))?;
            let h3 = MenuItem::with_id(handle, "format_h3", "H3 标题", true, Some("CmdOrCtrl+3"))?;
            let headings_menu = Submenu::with_items(handle, "标题", true, &[&h1, &h2, &h3])?;

            let ul = MenuItem::with_id(handle, "format_ul", "无序列表", true, Some("CmdOrCtrl+U"))?;
            let ol = MenuItem::with_id(handle, "format_ol", "有序列表", true, Some("CmdOrCtrl+Shift+U"))?; // Cmd+0 is often reset zoom, prefer standard

            let wechat_links = MenuItem::with_id(handle, "format_wechat_links", "微信外链转引用", true, None::<&str>)?;
            let stats = MenuItem::with_id(handle, "toggle_stats", "统计字数时间", true, None::<&str>)?;

            let format_menu = Submenu::with_items(
                handle,
                "格式",
                true,
                &[
                    &bold, &italic, &strike, &link, &code,
                    &PredefinedMenuItem::separator(handle)?,
                    &headings_menu,
                    &ul, &ol,
                    &PredefinedMenuItem::separator(handle)?,
                    &wechat_links,
                    &stats
                ],
            )?;

            // 5. View Menu
            let view_menu = Submenu::with_items(
                handle,
                "视图",
                true,
                &[
                    &PredefinedMenuItem::fullscreen(handle, Some("进入全屏"))?,
                ],
            )?;

            // 6. Window Menu
            let window_menu = Submenu::with_items(
                handle,
                "窗口",
                true,
                &[
                    &PredefinedMenuItem::minimize(handle, Some("最小化"))?,
                ],
            )?;

            // Build the Menu
            let menu = Menu::with_items(
                handle,
                &[
                    &app_menu,
                    &file_menu,
                    &edit_menu,
                    &format_menu,
                    &view_menu,
                    &window_menu
                ],
            )?;

            app.set_menu(menu)?;

            // Handle Menu Events
            app.on_menu_event(move |app, event| {
                let id = event.id.as_ref();
                // Emit event to frontend
                if let Err(e) = app.emit("menu-event", id) {
                    eprintln!("Failed to emit menu event: {}", e);
                }
            });
            
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Textura - 公众号排版工具").ok();
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

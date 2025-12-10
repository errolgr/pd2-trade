export const changeLog = {
  "0.5.2": [
    "🆕 Message templates have been added to the chat overlay - you can now save custom messages for quick replies.",
    "🆕 Game name will now persist through offers",
    "🔧 Fixed an issue trade whispers were not being notified from the last patch"
    ],
  "0.5.1": [
    "🔧 Fixed an issue where the rune price breakdown would not display the correct price.",
    "🔧 Fixed an issue in the currency valuation page where HR values were rounded to 3 decimal places.",
    "🆕 Show trade notifications in the chat button overlay - now displays the number of trade messages and offers in the chat button overlay.",
    "🆕 Add a quick remove button to the chat overlay to remove the chat overlay window.",
    "🔧 Prevent the chat window from opening when a new message is received",
  ],
  "0.5.0": [
    "🆕 Added chat system - communicate with other players through the PD2 overlay interface with real-time messaging",
    "🆕 Added chat overlay widget with spiral menu button - quick access to conversations, settings, and trade messages while in-game",
    "🆕 Added trade offers system - view and manage incoming/outgoing trade offers from the website",
    "🆕 Added trade messages container - unified view for whispers and website offers with accept/reject/revoke actions",
    "🆕 PD2 Trader now ingests item prices and offers current market prices - updated currency valuation and rune exchange pages to use this information",
    "🆕 Price data is now publicly available at pd2trader.com - browse currency, runes, and uber item prices with real-time market data",
    "🆕 Added real-time socket connection - receive live updates for offers, messages, and notifications",
    "🔧 Fixed authentication error handling - improved error recovery and user feedback",
  ],
  "0.4.11": [
    "🔧 Fixed stat range filters - min/max parameters are now only added when values are entered.",
    "🔧 Fixed issue where chat message notifications were not shown after restarting the game.",
  ],
  "0.4.10": [
    "✨ Join notifications - get notified when players join the game (disabled by default, only when Diablo is not focused).",
    "🔧Prevent trade whispers from stealing focus from Diablo when diablo is focused.",
    "⬇️⬇️⬇️ EVERYTHING ELSE FROM 0.4.9 ⬇️⬇️⬇️",
    "✨ Corrupted filter now has three states: show all items (unchecked), show only corrupted items (checked), or show only non-corrupted items (X icon).",
    "🆕 Added whisper notifications - play a sound when you receive whispers in-game.",
    "🆕 Added chat settings section with whisper notification controls and ignore list.",
    "🆕 Added ignore list feature - add players to ignore list to prevent whisper notifications from them.",
    "🆕 Added auto-detection for Diablo II installation directory in General settings.",
    "🆕 Show a warning toast when the user tries to list an item and they have reached the maximum number of listings (50).",
    "🔧 Fixed an issue where when deleting a listing, the item would not be removed from the quick list window.",
  ],
  "0.4.9": [
    "✨ Corrupted filter now has three states: show all items (unchecked), show only corrupted items (checked), or show only non-corrupted items (X icon).",
    "🆕 Added whisper notifications - play a sound when you receive whispers in-game.",
    "🆕 Added chat settings section with whisper notification controls and ignore list.",
    "🆕 Added ignore list feature - add players to ignore list to prevent whisper notifications from them.",
    "🆕 Added auto-detection for Diablo II installation directory in General settings.",
    "🆕 Show a warning toast when the user tries to list an item and they have reached the maximum number of listings (50).",
    "🔧 Fixed an issue where when deleting a listing, the item would not be removed from the quick list window.",
  ],
  "0.4.8": [
    "🔧 Fixed an issue where the price input caused an error when updating a listing",
  ],
  "0.4.7": [
    "🔧 Fixed an issue where class skills were incorrectly mapped.",
    "🔧 Fixed an issue that caused an error while updating the pricing of a listing",
  ],
  "0.4.6": [
    "🔧 Fixed an issue where rare jewels would not befound when listing an item",
    "🔧 Fixed an issue where some uniques/sets would not found when listing an item",
  ],
  "0.4.5": [
    "✨ You can now toggle between searching by base and searching by type in the price check window.",
    "🆕 The listing price input is more consistent with the trade website.",
    "🔧 Fixed an issue where the quick list window would not display the correct item name.",
    "🔧 Go to trade now goes to only the active listings instead of archive listings unless show expired is enabled.",
    "🔧 Fixed an issue where runewords would not be searchable in the price check window.",
  ],
  "0.4.4": [
    "✨ Price check window now supports dragging and resizing.",
    "✨ Bases, gems, currency & maps will now be searchable in the price check window.",
    "✨ Bases, gems, currency & maps , etc. will are now listable",
    "🆕 Items that are not listable will now display an error toast.",
  ],
  "0.4.3": [
    "🔧 Fixed an issue where the new quivers and bolts would not be found in stash",
  ],
  "0.4.2": [
    "✨ Updated the items database to include season 12 items unqiues and sets.",
  ],
  "0.4.1": [
    "🔧 Disabled the economy features in the currency valuation window as pd2.tools is not available.",
  ],
  "0.4.0": [
    "✨ Added a new tab to the quick list window to manage your listed items",
    "🆕 The quick list window is now resizable.",
    "🆕 Most windows are now draggable and may be moved around the screen.",
    "🔧 Prevent windows from opening if Diablo is not focused.",
    "🆕 Added a new setting to control the fill stat value percentage.",
    "🆕 Added the ability to show archived listings in the price check widget.",
    "🔧 Fixed an issue which caused enhanced damage to be incorrectly displayed in the price check widget.",
    "🔧 Fixed an issue which caused min and max damage to not populate correctly in the price check widget.",
    "🔧 Fixed an issue which caused all resistances to be incorrectly displayed in the price check widget.",
  ],
  "0.3.0": [
    "✨ Added feature to check the total value of your rune stash (default: ctrl + x)",
    "🔧 Fixed an issue which was causing the popup window to block the users input",
  ],
  "0.2.10": [
    "✨ List item now has a quick button to navigate to the trade website",
  ],
  "0.2.9": [
    "🔧 Fixed a bug that caused users with multiple accounts to always default to the first account, irrespective of the settings",
    "🔧 Items that are incorrectly named in game should more accurately be found in price checking and in stash.",
    "🆕 Searching for a normal/superior item will now search by its base instead of its name.",
    "🔧 Fixed Unicode encoding issue that caused 'btoa' errors when item data contained special characters.",
    "✨ When listing an item, a toast will pop up, allowing you to navigate to the listing on the trade site.",
  ],
  "0.2.8": [
    "💎 PD2 popover will now toggle between fullscreen and the diablo screen if its focused.",
    "🔧 Fixed a bug where searching more than 1 modifier would not return results when using the live search.",
    "🔧 Fixed a bug where borderless windows would not allow the taskbar to be in the foreground.",
    "🔧 Fixed a bug where some GC skillers would not map to the correct skills."
  ],
  "0.2.7": [
    "🔧 Fixed an issue which caused charm skillers to never map to the correct skills",
    "🔧 Fixed an issue which caused the auto updated not to function correctly.",
    "✨ Added check for latest version in the about settings.",
  ],
  "0.2.6": [
    "✨ Hidden screen will now be open within the bounds of the Diablo II window if available.",
    "🔧 Fixed an issue that caused the list item hot key not to update automatically",
    "🆕 Failed requests to PD2 will no longer crash the client. Instead will display an error to the user",
    "🔧 Fixed an issue which caused runewords to fail in the live search",
  ],
  "0.2.5": [
    "🔧 Fixed another critical launch issue that was causing app to stall during launch",
    "🔧 Requests are now proxied to PD2",
  ],
  "0.2.4": [
    "🔧 Fixed critical launch issue that was causing the app to stall during launch",
  ],
  "0.2.3": [
    "🔧 Fixed an issue that was causing timeouts and socket connection failures",
    "💎 Should see a noticable performance increase with listings, and item listings",
    "🔧 Fixed an issue which caused rings to not appear in the market listings",
  ],
  "0.2.2": [
    "🔧 Fixed an issue that was causing timeouts and socket connection failures",
    "💎 Should see a noticable performance increase with listings, and item listings",
  ],
  "0.2.1": [
    "🔧 Fixed an issue that was causing boot up to fail",
    "🆕 Added a toast popup into the side menu"
  ],
  "0.2.0": [
    "✨ List items directly from your stash (Ctrl + L)",
    "✨ Get prices directly within the price check widget.",
    "💎 Added rune price exchange, top left corner of pricing widget (CTRL + D)",
    "🐛 Various bug fixes and UI improvements."
  ],
  "0.1.6": [
    "🆕 Added rune pricing information from pd2.tools API",
    "📊 Shows current rune prices with listing counts and calculated values",
    "🆕 Added rune breakdown calculator - click any rune to see combinations",
    "🆕 Added top bar with rune information popover in item overlay"
  ],
  "0.1.5": [
    "Hardcore was enabled by default in the settings, changed to softcore.",
    "Fixed display of non-ladder mode in settings.",
    "Search window will only open if Diablo II is focused"
  ],
  "0.1.4": [
    "!! Ctrl + C hotkey has been remapped to Ctrl + D!!",
    "🆕 Added support for custom hotkeys in settings.",
    "🔄 Settings sync across windows",
    "Fixed hotkey conflicts with PD2 Trade.",
  ],
  "0.1.3": [
    "!! Ctrl + C hotkey has been remapped to Ctrl + D!!",
    "🆕 Added support for custom hotkeys in settings.",
    "🔄 Settings sync across windows"
  ]
}
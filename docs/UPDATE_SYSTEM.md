# 📱 BettingApp - Update System

## ✅ What's Done

Your app now has automatic update capabilities:

- ✅ Manual update button in Settings
- ✅ Automatic update check on app startup
- ✅ **Silent background updates** (downloads without showing dialog)
- ✅ **Aggressive force updates** (blocks app until installed)
- ✅ APK download and installation
- ✅ All permissions configured
- ✅ Points to your Laravel server

## ⚠️ Important: Android Security Limitation

**You CANNOT fully install without user interaction.** Android requires users to tap "Install" for security.

**What you CAN do:**

- ✅ Auto-check for updates
- ✅ Auto-download in background
- ✅ Auto-open installer
- ❌ Auto-click "Install" button (blocked by Android)

---

## 🚀 Quick Setup

### Add This to Your Laravel (routes/api.php)

```php
Route::get('/version', function () {
    return response()->json([
        'latestVersion' => '2.6',
        'versionCode' => 16,
        'downloadUrl' => 'http://philippinestl.com/downloads/v2.6.apk',
        'forceUpdate' => false,
        'releaseNotes' => 'Current stable version',
    ]);
});
```

### Test It

```bash
curl http://zian-api-v1.philippinestl.com/api/version
```

Then open app → Settings → "Check for Updates"

---

## 📦 When Releasing New Version (e.g., v2.7)

### 1. Update Version in build.gradle

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 17        // Was 16
    versionName "2.7"     // Was "2.6"
}
```

### 2. Build APK

```bash
cd android
./gradlew assembleRelease
```

### 3. Upload APK

Upload `android/app/build/outputs/apk/release/app-release.apk` to your server as `v2.7.apk`

### 4. Update Laravel Route

```php
Route::get('/version', function () {
    return response()->json([
        'latestVersion' => '2.7',     // ← Update
        'versionCode' => 17,           // ← Update
        'downloadUrl' => 'http://philippinestl.com/downloads/v2.7.apk', // ← Update
        'forceUpdate' => false,
        'releaseNotes' => "What's new:\n• Bug fixes\n• New features",
    ]);
});
```

### 5. Done!

Users will see update notification next time they open the app.

---

## 📊 Better: Database-Driven (Optional)

### Migration

```bash
php artisan make:migration create_app_versions_table
```

```php
Schema::create('app_versions', function (Blueprint $table) {
    $table->id();
    $table->string('version_name');
    $table->integer('version_code');
    $table->boolean('force_update')->default(false);
    $table->text('release_notes')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### Model

```php
// app/Models/AppVersion.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppVersion extends Model
{
    protected $fillable = ['version_name', 'version_code', 'force_update', 'release_notes', 'is_active'];
    protected $casts = ['force_update' => 'boolean', 'is_active' => 'boolean', 'version_code' => 'integer'];

    public function getDownloadUrlAttribute()
    {
        return "http://philippinestl.com/downloads/v{$this->version_name}.apk";
    }

    public static function getLatest()
    {
        return self::where('is_active', true)->orderBy('version_code', 'desc')->first();
    }
}
```

### Controller

```php
// app/Http/Controllers/Api/VersionController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppVersion;

class VersionController extends Controller
{
    public function index()
    {
        $version = AppVersion::getLatest();
        if (!$version) return response()->json(['error' => 'No version available'], 404);

        return response()->json([
            'latestVersion' => $version->version_name,
            'versionCode' => $version->version_code,
            'downloadUrl' => $version->download_url,
            'forceUpdate' => $version->force_update,
            'releaseNotes' => $version->release_notes,
        ]);
    }
}
```

### Route

```php
Route::get('/version', [App\Http\Controllers\Api\VersionController::class, 'index']);
```

### Add New Version

```bash
php artisan tinker
```

```php
use App\Models\AppVersion;

AppVersion::where('is_active', true)->update(['is_active' => false]);

AppVersion::create([
    'version_name' => '2.7',
    'version_code' => 17,
    'force_update' => false,
    'release_notes' => "• Bug fixes\n• New features",
    'is_active' => true,
]);
```

---

## 🎯 Your Current Setup

- **Laravel API:** `zian-api-v1.philippinestl.com`
- **APK Downloads:** `philippinestl.com/downloads/`
- **Current Version:** 2.6 (versionCode 16)
- **Current APK:** `v2.6.apk`
- **Update Service:** Already configured ✅

---

## 🔧 Key Files Modified

### React Native / TypeScript

- `src/services/updateService.ts` - Update logic
- `src/App.tsx` - Automatic check on startup
- `src/screens/AppScreens/Setting/index.tsx` - Manual update button

### Android Native

- `android/app/src/main/AndroidManifest.xml` - Permissions
- `android/app/src/main/res/xml/file_paths.xml` - FileProvider
- `android/app/src/main/java/com/bettingapp/ApkInstallerModule.java` - Native installer (NEW)
- `android/app/src/main/java/com/bettingapp/ApkInstallerPackage.java` - Native package (NEW)
- `android/app/src/main/java/com/bettingapp/MainApplication.kt` - Module registration (UPDATED)

---

## 🔍 Three Update Modes

### Mode 1: Show Dialog (Default)

```
User opens app → Check version → Show "Update Available" dialog
→ User taps "Update" → Download → Install
```

### Mode 2: Silent Background Download (Recommended)

```
User opens app → Check version → Download in background (silent)
→ When done, show "Update Ready" → User taps "Install Now"
→ Installer opens → User taps "Install"
```

**Best UX:** Users don't wait for download, it happens in background.

### Mode 3: Aggressive Force Update

```
User opens app → Check version → If forceUpdate=true
→ Show blocking dialog (cannot dismiss) → User MUST update
```

**Use carefully:** Only for critical security updates.

---

## ⚙️ Choose Your Update Mode

Edit `src/App.tsx` (lines 70-78):

```typescript
// Option 1: Show dialog immediately
// automaticUpdateCheck();

// Option 2: Silent background download (RECOMMENDED)
silentBackgroundUpdate();

// Option 3: Aggressive - force update
// aggressiveAutoUpdate();
```

**Currently using:** Silent background download

---

## 🐛 Troubleshooting

### "Could not check for updates"

- Check Laravel API is running
- Test: `curl http://zian-api-v1.philippinestl.com/api/version`

### "Download failed"

- Verify APK exists at download URL
- Test: `curl -I http://philippinestl.com/downloads/v2.6.apk`

### APK won't install / Opens chat/message instead

**Fixed!** A native Android module has been added to properly handle APK installation.

**You need to rebuild the app once:**

```bash
cd android
./gradlew clean
cd ..
npm run android
```

This will compile the new native module that properly opens the Android package installer.

### APK won't install (other reasons)

- Must be signed with same keystore
- Check: `android/app/betting_app.keystore`

---

## 🔒 Security Note

⚠️ Currently using HTTP. For production, consider enabling HTTPS on philippinestl.com to prevent man-in-the-middle attacks.

---

## 🎯 Best Practices

### For Regular Updates

Use **Silent Background Download**:

- Non-intrusive
- Users don't wait for download
- App remains usable during download
- Shows "Update Ready" when complete

### For Critical Security Updates

Set `forceUpdate: true` in Laravel:

```php
'forceUpdate' => true,  // Blocks app until installed
```

### Update Frequency

- Check on app start (already implemented)
- Optionally: Check periodically (every 24 hours)
- Optionally: Check when app comes to foreground

---

## 🚀 Advanced: Periodic Background Checks

To check for updates every 24 hours (optional):

```typescript
// In App.tsx
useEffect(() => {
  const checkInterval = setInterval(
    () => {
      silentBackgroundUpdate();
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours

  return () => clearInterval(checkInterval);
}, []);
```

---

## ❓ FAQ

**Q: Can I install without user tapping "Install"?**
A: No, Android security prevents this. Even system apps require user confirmation.

**Q: What about root access?**
A: Root can bypass this, but 99.9% of users don't have root.

**Q: Can I use this for enterprise/MDM?**
A: Yes, if devices are in Device Owner mode, but that's a different setup.

**Q: How close can I get to automatic?**
A: Silent background download is the best UX - user only sees "Update Ready" notification.

---

## ✨ That's It!

Just add the `/api/version` endpoint to Laravel and you're done! 🎉

Your app will now:

1. Check for updates on startup
2. Download in background silently
3. Notify user when ready
4. Auto-open installer when user taps "Install Now"

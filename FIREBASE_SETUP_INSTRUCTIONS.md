# 🔥 Firebase Service Account Setup Instructions

## ⚠️ CRITICAL SECURITY WARNING

**serviceAccountKey.json contains FULL ADMIN ACCESS to your Firebase project!**

- ❌ NEVER commit this file to Git
- ❌ NEVER share this file publicly
- ❌ NEVER upload to GitHub, Discord, or any public place
- ✅ Keep it LOCAL ONLY on your development machine

---

## 📥 How to Get Your Service Account Key

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project

### Step 2: Navigate to Service Accounts
1. Click ⚙️ **Project Settings** (gear icon, top left)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Click **Generate key** in the popup

### Step 3: Download & Save
1. A JSON file will download (e.g., `your-project-firebase-adminsdk-xxxxx.json`)
2. **Rename it to:** `serviceAccountKey.json`
3. **Move it to:** `/app/serviceAccountKey.json`

---

## 📂 File Location

Your file should be at:
```
/app/serviceAccountKey.json
```

**Example structure:**
```json
{
  "type": "service_account",
  "project_id": "trucker-nav-12345",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@trucker-nav-12345.iam.gserviceaccount.com",
  ...
}
```

---

## ✅ Verify Setup

After placing the file, restart your server:
```bash
sudo supervisorctl restart trucker-nav
```

Check logs:
```bash
tail -f /var/log/supervisor/trucker-nav.out.log
```

You should see:
```
✅ Firebase Admin initialized successfully from serviceAccountKey.json
```

---

## 🔒 Security Checklist

- [x] `serviceAccountKey.json` added to `.gitignore`
- [ ] File placed in `/app/serviceAccountKey.json`
- [ ] **NEVER** run `git add serviceAccountKey.json`
- [ ] **VERIFY** before every git push: `git status` (should NOT show serviceAccountKey.json)

---

## 🚨 If Credentials Are Exposed

If you accidentally commit/push this file:

1. **Immediately delete the key** from Firebase Console
2. Generate a NEW key
3. Remove the file from Git history:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch serviceAccountKey.json" \
   --prune-empty --tag-name-filter cat -- --all
   ```
4. Force push to overwrite history:
   ```bash
   git push origin --force --all
   ```

---

## 📞 Need Help?

- Firebase Console: https://console.firebase.google.com/
- Service Account Docs: https://firebase.google.com/docs/admin/setup

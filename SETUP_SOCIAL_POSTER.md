# Social Media Auto-Poster Setup — Complete Checklist

## Your Secret Key (Keep Safe)
```
f4a70d6d3a7ba250d92ec5f0fea7a0aa5087231938c7fe262b56a01285bddd6e
```

---

## ✅ Step 1 — Render Environment Variables (3 minutes)

Go to **Render Dashboard → xpert-life-solutions-ai-agents service → Environment**

Add these 3 variables:

### 1. TRIGGER_SECRET_KEY
**Value:** `f4a70d6d3a7ba250d92ec5f0fea7a0aa5087231938c7fe262b56a01285bddd6e`

### 2. INSTAGRAM_USER_ID & FACEBOOK_PAGE_ID
You'll get these from Graph API URLs below. After you paste them, your URLs will be:

**First, paste this in browser** (get FACEBOOK_PAGE_ID):
```
https://graph.facebook.com/v21.0/me/accounts?access_token=EAANnZAVPfsUgBRm8rRhU36ZAM7kRkZCZBXmlG0DKLe9flfDbttByJaAVSyZA03wDZCx2hwqzMS3FGP8QN1nRwZCZBuhQageSxEEZBKyP3OL6MCQuyZCilKQKnoKRrLO3EIC36hitfVJK2zIl2fIVetHi9KY4Bz3Ez6Av5WqrJGDPtVrEkJPCovd13xx0J5scwWBO3TyZAPnhXLVjHviBZBUDZBRGN9y9TGkIaTb5r
```

Look for your page name (Xpert Life...) — copy the `"id"` value → **FACEBOOK_PAGE_ID**

**Then paste this** (replace `PAGE_ID` with what you just copied):
```
https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=EAANnZAVPfsUgBRm8rRhU36ZAM7kRkZCZBXmlG0DKLe9flfDbttByJaAVSyZA03wDZCx2hwqzMS3FGP8QN1nRwZCZBuhQageSxEEZBKyP3OL6MCQuyZCilKQKnoKRrLO3EIC36hitfVJK2zIl2fIVetHi9KY4Bz3Ez6Av5WqrJGDPtVrEkJPCovd13xx0J5scwWBO3TyZAPnhXLVjHviBZBUDZBRGN9y9TGkIaTb5r
```

Copy the `"id"` inside `"instagram_business_account"` → **INSTAGRAM_USER_ID**

**Add to Render:**
| Key | Value |
|---|---|
| `TRIGGER_SECRET_KEY` | `f4a70d6d3a7ba250d92ec5f0fea7a0aa5087231938c7fe262b56a01285bddd6e` |
| `INSTAGRAM_USER_ID` | (from second URL above) |
| `FACEBOOK_PAGE_ID` | (from first URL above) |

Click **Save Changes** → Render auto-redeploys.

---

## ✅ Step 2 — Create Make.com Scenario (2 minutes)

1. Go to **make.com**
2. Click **Scenarios → Create new scenario**
3. Click **⋯ (three dots) → Import Blueprint**
4. **Paste this entire JSON:**

```json
{
  "name": "Xpert Life — Social Media Auto-Poster",
  "flow": [
    {
      "id": 1,
      "module": "http:ActionSendData",
      "version": 3,
      "parameters": {
        "handleErrors": false,
        "useNewZLibDeCompress": true
      },
      "mapper": {
        "url": "https://ttc-1-branch-claude-xpert-life-ai-agents.onrender.com/api/run/social-post",
        "method": "post",
        "headers": [
          { "name": "x-auth-token", "value": "f4a70d6d3a7ba250d92ec5f0fea7a0aa5087231938c7fe262b56a01285bddd6e" }
        ],
        "timeout": 40,
        "useMtls": false,
        "useQuerystring": false,
        "serializeUrl": false,
        "bodyType": "",
        "parseResponse": false,
        "authUser": "",
        "authPass": "",
        "shareCookies": false,
        "ca": "",
        "rejectUnauthorized": true,
        "followRedirect": true,
        "useNewZLibDeCompress": true,
        "gzip": false
      },
      "metadata": { "designer": { "x": 0, "y": 0 } }
    }
  ],
  "metadata": {
    "instant": false,
    "version": 1,
    "scenario": {
      "roundtrips": 1,
      "maxErrors": 3,
      "autoCommit": true,
      "autoCommitTriggerLast": true,
      "sequential": false,
      "confidential": false,
      "dataloss": false,
      "dlq": false,
      "freshVariables": false
    },
    "designer": { "orphans": [] },
    "zone": "us1.make.com"
  }
}
```

5. After import:
   - Look for the **Schedule** button
   - Set to **Every 30 minutes**
   - Click **Activate**

---

## ✅ How It Works

- Content Calendar: Create items in your Notion "Content Calendar" with:
  - **Status**: "Scheduled"
  - **Scheduled Date**: today or earlier
  - **Platform**: "Instagram" or "Facebook"
  - **Hook**: Short opening line
  - **Script**: Main content
  - **Hashtags**: (optional)
  - **Image URL**: (optional — falls back to Unsplash)

- Every 30 minutes, Make.com will call `/api/run/social-post`
- Finds all scheduled posts ready to publish
- Posts to Instagram (two-step Graph API)
- Posts to Facebook Page
- Marks as "Published" in Notion

---

## ⚠️ Important Notes

- **Instagram Access Token**: Verify it has `instagram_content_publish` scope. If posts fail, regenerate token with expanded permissions.
- **Notion Content Calendar**: The database ID is already configured (`110a4ce2-a527-4034-8c46-ccea715adfbd`)
- **Render URL**: Uses the live Render domain `ttc-1-branch-claude-xpert-life-ai-agents.onrender.com`

---

## 🚀 Test It

Once set up:
1. Create a test post in your Notion Content Calendar
2. Set Status to "Scheduled"
3. Set Platform to "Instagram"
4. Wait up to 30 minutes (or manually trigger via `/api/run/social-post` endpoint with auth header)
5. Check your Instagram account — post should appear!

**Enjoy automated social posting!** 🎉

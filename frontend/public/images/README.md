# How to Add Your Photos

## Quick Steps:

### 1. Place Your Photo Here
Put your profile photo in this folder: `/app/frontend/public/images/`

**File naming examples:**
- `profile.jpg`
- `my-photo.png`
- `avatar.jpg`

### 2. Update the Config File
Open: `/app/frontend/src/config/siteConfig.js`

Find this line:
```javascript
profileImage: "https://danielautry.com/static/media/profile.3aaf58cfebb540d740ee.jpeg",
```

Replace it with:
```javascript
profileImage: "/images/your-photo-name.jpg",
```

### 3. Save and Refresh
The site will automatically reload with your new photo!

---

## Photo Requirements:
- **Size:** 400x400px or larger (square format preferred)
- **Format:** JPG, PNG, or WebP
- **File Size:** Under 500KB recommended
- **Note:** The site applies grayscale filter automatically

---

## Example:
If your photo is named `my-photo.jpg`:

1. Copy it to: `/app/frontend/public/images/my-photo.jpg`
2. Update config: `profileImage: "/images/my-photo.jpg",`
3. Done! Your photo will appear on the site.

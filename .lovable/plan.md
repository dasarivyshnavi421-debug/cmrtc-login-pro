

## Plan: Faculty Settings with Personal Details & Profile Photo (Once-per-Year Update)

### Overview
Add a "Settings" tab for faculty users where they can view their personal details, upload a profile photo, and update it — restricted to once per year.

### Database Changes

**Migration: Add profile fields to `faculty` table**
- Add `profile_updated_at` (timestamptz, nullable) column to track when the profile photo was last changed
- This column enforces the once-per-year restriction

### New Component: `SettingsTab.tsx`
- Displays the logged-in faculty's personal details (name, department, email) as read-only fields
- Shows current profile photo (or initials fallback)
- "Upload Photo" button that:
  - Checks `profile_updated_at` — if less than 1 year ago, shows a disabled state with "Next update available on [date]"
  - If allowed, accepts an image file, converts to base64, saves via `updateFacultyPhoto()`, and sets `profile_updated_at` to now
- Clean card-based layout consistent with existing tabs

### Changes to `attendance-store.ts`
- Add `profileUpdatedAt` to the `Faculty` interface
- Update `fetchFaculty()` to include `profile_updated_at`
- Update `updateFacultyPhoto()` to also set `profile_updated_at = now()`

### Changes to `Dashboard.tsx`
- Add a "Settings" tab (with Settings icon) to `facultyTabs`
- Render `<SettingsTab />` when active
- Faculty's own record is identified by matching demo user name to faculty name (current auth uses demo users, not linked to faculty table)

### Files

| File | Action |
|------|--------|
| Migration SQL | Add `profile_updated_at` column |
| `src/components/SettingsTab.tsx` | Create — personal details + photo upload with yearly restriction |
| `src/lib/attendance-store.ts` | Update Faculty interface and photo update function |
| `src/pages/Dashboard.tsx` | Add Settings tab for faculty |


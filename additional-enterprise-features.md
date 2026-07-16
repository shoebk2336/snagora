# Additional Enterprise Features

## GPS Location (Optional)

Each issue should support attaching the device's current GPS coordinates.

The feature must be optional because many inspections happen indoors where GPS may be unavailable.

When enabled, automatically capture:

- Latitude
- Longitude
- Accuracy
- Timestamp

Display the captured location on the issue details page.

Allow opening the location in Google Maps later.

If GPS is unavailable, allow the issue to be saved without location.

---

## Photo Annotation

Every captured photo should support annotation before saving.

### Annotation Tools

- Arrow
- Circle
- Rectangle
- Freehand Draw
- Text Labels
- Number Marker
- Highlight Tool

### Additional Features

- Undo
- Redo
- Eraser
- Change annotation color
- Zoom while annotating

Users should be able to annotate multiple photos independently.

Store both:

- Original Image
- Annotated Image

Allow editing annotations later.

---

## Standard Defect Templates

Provide reusable issue templates to reduce typing.

Each template may contain:

- Category
- Sub Category
- Default Priority
- Standard Description
- Recommended Action
- Assigned Department
- Default Status

### Example Templates

#### Electrical
- Broken Switch
- Exposed Wiring
- Damaged Socket
- Light Not Working

#### Civil
- Wall Crack
- Ceiling Crack
- Tile Damage
- Water Leakage

#### HVAC
- AC Not Cooling
- Air Filter Dirty
- Water Leakage
- Noise Issue

#### Fire Fighting
- Fire Extinguisher Missing
- Hose Reel Damaged
- Sprinkler Leakage

#### Plumbing
- Tap Leakage
- Pipe Leakage
- Blocked Drain
- Toilet Flush Issue

#### Carpentry
- Door Not Closing
- Broken Handle
- Loose Lock
- Damaged Cabinet

Users should be able to:

- Create templates
- Edit templates
- Delete templates
- Mark templates as Favorites
- Search templates

Selecting a template should automatically populate all predefined fields while still allowing edits.

---

## Draft Auto Save

Prevent data loss at every stage of inspection.

### Requirements

Automatically save the draft:

- Every few seconds
- After capturing a photo
- After editing any field
- After changing category
- After changing priority
- After recording voice notes
- After adding remarks

If the application closes unexpectedly or the device restarts:

- Restore unfinished inspections automatically.
- Show a prompt:

> "An unfinished inspection was found. Would you like to continue?"

Options:

- Resume Draft
- Discard Draft

Drafts must work completely offline.

Users can manually save drafts from the issue screen.

A **Draft** badge should appear beside incomplete inspections.

### Automatic Cleanup

- Remove completed drafts after successful submission.
- Keep unfinished drafts until manually deleted.

Drafts must preserve:

- Photos
- Annotated Photos
- GPS Location
- Room Information
- Category
- Priority
- Description
- Remarks
- Voice Notes
- Selected Templates
- Any other entered data

# Featured Content (Pin Query Block)

A WordPress block plugin that lets editors search across posts and events, pin selected items, reorder them, and display them as a featured content section.

## Features

- Search posts and events (supports [The Events Calendar](https://theeventscalendar.com/) plugin's `tribe_events` post type)
- Pin items and reorder them via drag-and-drop or arrow buttons
- Configurable grid columns (1-4)
- Responsive layout — stacks on mobile, 2 columns on tablet
- Displays featured image, post type badge, title, date, and excerpt
- Events show their event date instead of the publish date

## Requirements

- WordPress 6.1+
- PHP 7.0+
- Node.js (for development builds)

## Installation

1. Clone this repository into `wp-content/plugins/`:
   ```bash
   git clone https://github.com/your-org/wp-pin-query-block.git
   cd wp-pin-query-block
   npm install
   npm run build
   ```
2. Activate "Featured Content (Pin Query Block)" in the WordPress admin.

### Deploying as a zip

```bash
npm run build
zip -r wp-pin-query-block.zip wp-pin-query-block.php build/
```

Upload the zip via **Plugins > Add New > Upload Plugin**.

## Development

```bash
npm start    # watch mode with auto-rebuild
npm run build  # production build
```

## Usage

1. In the block editor, add the **Featured Content** block.
2. Type in the search box to find posts and events.
3. Click **Pin** to add items to the featured section.
4. Drag to reorder or use the arrow buttons.
5. Adjust the number of columns in the block sidebar settings.

## License

GPL-2.0-or-later

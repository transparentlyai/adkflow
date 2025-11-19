# ADKFlow Frontend

Visual workflow editor for Google Agent Development Kit (ADK) - built with Next.js, TypeScript, and Drawflow.

## Features

- Visual drag-and-drop workflow builder
- Support for Agents, Subagents, and Prompts
- YAML import/export functionality
- Real-time workflow validation
- Integration with ADKFlow backend API

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Drawflow** - Visual node-based workflow library
- **Axios** - HTTP client for API communication
- **@uiw/react-md-editor** - Markdown editing for prompts

## Prerequisites

- Node.js 18+ and npm
- ADKFlow backend running on `http://localhost:8000`

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

Edit `.env.local` to set your backend API URL (default is `http://localhost:8000`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The page will auto-reload when you make changes to the code.

## Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main workflow editor page
│   └── globals.css        # Global styles + Drawflow styles
├── components/            # React components
│   ├── Toolbar.tsx        # Sidebar toolbar
│   └── DrawflowCanvas.tsx # (To be created) Drawflow integration
├── lib/                   # Utilities and configurations
│   ├── types.ts           # TypeScript interfaces
│   └── api.ts             # API client functions
├── public/                # Static assets
├── .env.local            # Environment variables
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## API Integration

The frontend communicates with the backend API through the following endpoints:

- `POST /api/validate` - Validate workflow configuration
- `POST /api/export/yaml` - Export workflow to YAML
- `POST /api/import/yaml` - Import workflow from YAML
- `GET /api/tools` - Get available tools list

All API functions are available in `lib/api.ts`.

## Next Steps

### Integrate Drawflow

1. Create `components/DrawflowCanvas.tsx` component
2. Initialize Drawflow instance with proper configuration
3. Implement node creation, connection, and deletion handlers
4. Add node property editing functionality
5. Integrate with workflow state management

### Additional Features

- Add node property editor panel
- Implement workflow validation UI
- Add zoom and pan controls
- Create node search/filter functionality
- Add keyboard shortcuts
- Implement undo/redo functionality

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000` |

## Troubleshooting

### Port already in use

If port 3000 is already in use, specify a different port:

```bash
PORT=3001 npm run dev
```

### API connection issues

Ensure the backend is running and accessible at the URL specified in `.env.local`.

Check CORS configuration on the backend if you encounter CORS errors.

## License

MIT

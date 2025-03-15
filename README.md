# Research Assistant Application

A full-stack application designed to help users find comprehensive answers to their research questions using multiple external APIs.

## Features

- Search for information using Perplexity AI API and Serper API
- Aggregation of results from multiple sources
- Clean UI for displaying research results with citations
- Markdown support for formatted answers

## Tech Stack

- **Frontend**: Next.js with React
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Markdown**: React-Markdown

## Getting Started

### Prerequisites

- Node.js (v14+)
- API keys for:
  - [Perplexity API](https://docs.perplexity.ai/)
  - [Serper API](https://serper.dev/)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd research-app
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with your API keys:
```
PERPLEXITY_API_KEY=your_perplexity_api_key
SERPER_API_KEY=your_serper_api_key
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application

## Environment Variables

- `PERPLEXITY_API_KEY` - API key for Perplexity AI
- `SERPER_API_KEY` - API key for Serper

## API Endpoints

- `POST /api/research` - Submit a research query and get aggregated results

## Project Structure

```
research-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── research/
│   │   │       └── route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── SearchForm.tsx
│   │   └── ResearchResults.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── perplexity.ts
│   │   │   ├── serper.ts
│   │   │   └── research.ts
│   │   └── types.ts
│   └── utils/
├── .env.local
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Further Enhancements

- Add user authentication
- Save research history
- Implement more search APIs
- Add multi-language support
- Create a database for persistent storage

## License

MIT 
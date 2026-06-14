# Redefine

**AI-powered word learning, reimagined.**

![Redefine Screenshot](screenshot.png)

Redefine is an intelligent vocabulary learning app that uses LLMs to generate rich explanations and Anki flashcards for any word, phrase, or concept.

## ✨ Features

- **Personalized Learning** — Everyone learns differently. Edit the prompts to generate definitions and flashcards the way you understand best—change the language, style, complexity, or format to match how your brain works
- **AI-Powered Explanations** — Get clear, contextual explanations with pronunciation, related concepts, and usage examples
- **Smart Flashcard Generation** — Auto-generates Anki-style cloze cards embedded in real-world sentences
- **Multi-Provider LLM Support** — Works with OpenAI, Anthropic Claude, and Google Gemini
- **Anki Integration** — Export flashcards to Anki with a single tap; optional AnkiWeb sync pushes cards to AnkiDroid automatically
- **Mobile-First Design** — Built for learning on the go. Instead of searching in your browser, search here and get flashcards you can import directly into Anki
- **Lightweight** — Uses only ~15MB of memory
- **Self-Hosted** — Your data stays with you

## 🚀 Getting Started

### Option 1: Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
services:
  redefine:
    image: ghcr.io/kirarpit/redefine:latest
    container_name: redefine
    ports:
      - "5612:5000"
    environment:
      - SALT_KEY=${SALT_KEY}
    volumes:
      - redefine_data:/data
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped

volumes:
  redefine_data:
```

Create a `.env` file with a salt key:

```bash
# Generate a salt key and save to .env
echo "SALT_KEY=$(openssl rand -base64 32)" > .env
```

Start the app:

```bash
docker-compose up -d
```

Open [http://localhost:5612](http://localhost:5612) and add your LLM in Settings.

> **Important**: Keep your `.env` file safe! If you lose the `SALT_KEY`, you'll lose access to your encrypted API keys.

### Option 2: Docker Run

```bash
# Generate a salt key and save to .env
echo "SALT_KEY=$(openssl rand -base64 32)" > .env

# Run the container
docker run -d \
  --name redefine \
  -p 5612:5000 \
  --env-file .env \
  -v redefine_data:/data \
  --read-only \
  --cap-drop=ALL \
  --security-opt=no-new-privileges:true \
  --restart unless-stopped \
  ghcr.io/kirarpit/redefine:latest
```

Open [http://localhost:5612](http://localhost:5612) and add your LLM in Settings.

> **Important**: Keep your `.env` file safe! If you lose the `SALT_KEY`, you'll lose access to your encrypted API keys.

## 🔧 Configuration

### Adding an LLM Model

1. Navigate to **Settings**
2. Click **Add Your First Model**
3. Enter your model details:
   - **Model ID**: `gemini/gemini-2.0-flash` or `gemini/gemini-2.5-flash-lite` (recommended)
   - **API Key**: Your API key

### Recommended: Gemini (Free)

We recommend **`gemini/gemini-2.0-flash`** or **`gemini/gemini-2.5-flash-lite`** — both are fast, high-quality, and have generous free tiers.

👉 [Get a free API key from Google AI Studio](https://aistudio.google.com/apikey)

### Other Supported Models

| Provider  | Format              | Example                                |
| --------- | ------------------- | -------------------------------------- |
| Google    | `google/<model>`    | `gemini/gemini-2.0-flash`              |
| OpenAI    | `openai/<model>`    | `openai/gpt-4o`                        |
| Anthropic | `anthropic/<model>` | `anthropic/claude-3-5-sonnet-20241022` |

<a name="ankiweb-sync"></a>

### Anki Integration

**Option A — Download and import (no setup)**

Tap "Download for Anki" and import the file directly into AnkiMobile or AnkiDroid.

**Option B — AnkiConnect (desktop Anki)**

Run [AnkiConnect](https://ankiweb.net/shared/info/2055492159) on the same machine as your browser. Redefine will detect it and enable "Send to Anki" for one-tap imports.

**Option C — AnkiWeb sync (recommended for mobile)**

Add the `anki-server` sidecar to automatically sync cards to AnkiDroid whenever you tap "Send to Anki" — no extra apps needed on your phone.

1. Clone this repo so you have the `anki-server/` directory
2. Uncomment the `anki-server` service and `ANKI_CONNECT_URL` in `docker-compose.yml`
3. Start both services:

```bash
docker-compose up -d
```

4. Open Settings → **AnkiWeb Sync** and sign in with your AnkiWeb credentials
5. Tap "Send to Anki" on any flashcard — it will appear in AnkiDroid after the next sync

> **How it works:** A lightweight headless Python sidecar manages a local Anki collection and syncs it to AnkiWeb after each card is saved. Your AnkiWeb password is used only to obtain a session token and is never stored.

## 🛠️ Local Development

If you want to contribute or customize:

```bash
# Start the backend
cd server/go
./run.sh

# In a new terminal, start the frontend
cd web
npm install
npm run start
```

Open [http://localhost:3000](http://localhost:3000)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  <em>Created with ❤️ for smarter learning</em>
</p>

# Custom Price Book Management Studio

A beautiful, interactive interface for building, managing, and deploying Custom Price Books to CloudHealth. 

Live Deployment: [https://digitalsuni-cloud.github.io/cpb-ch/](https://digitalsuni-cloud.github.io/cpb-ch/)

## Running Locally (Bypassing CORS)

Because the public GitHub Pages deployment runs directly in your browser, hitting the `https://chapi.cloudhealthtech.com/v1` API will occasionally trigger browser CORS (Cross-Origin Resource Sharing) restrictions depending on your enterprise endpoint settings.

To completely bypass CORS and securely push/pull Price Books straight from CloudHealth without needing a proxy, you can run this exact UI locally on your machine.

We have built a custom API Proxy directly into the local development server to bypass CORS!

### Step 1: Clone the Repository
```bash
git clone https://github.com/digitalsuni-cloud/cpb-ch.git
cd cpb-ch/cpb-react
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Local Proxy Server
```bash
npm run dev
```

### Step 4: Access the UI
Open your browser to the local address provided (e.g. `http://localhost:5173/cpb-ch/`). 

The application will automatically detect that you're running locally and will securely proxy your API key requests to CloudHealth, ensuring the ☁️ **Import from API** and 🚀 **Deploy to CloudHealth** buttons work flawlessly!

## Features
- **Visual Rule Builder**: Visually construct billing rules without writing any XML.
- **Natural Language Summary**: Ensure pricing structures are logical before pushing.
- **Direct CloudHealth Sync**: Download and patch price books straight from the API.
- **Deployment Artifacts**: Generates raw `curl` or JSON packages for bulk execution.

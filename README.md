<div align="center">
  
  # 🎯 PrepMaster AI
  **Multimodal Interview Coach**

  [![React](https://img.shields.io/badge/React-19.0-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-12.0-FFCA28.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Gemini AI](https://img.shields.io/badge/Gemini_AI-Live_API-8E75B2.svg?style=for-the-badge&logo=google)](https://ai.google.dev/)

  *Master your interviews with real-time AI feedback, resume parsing, and comprehensive performance analytics.*

</div>

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Features](#-key-features)
- [Who Benefits?](#-who-benefits)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Tech Stack](#-tech-stack)
- [SDLC Stages](#-sdlc-stages)
- [Folder Structure](#-folder-structure)
- [Getting Started (Installation)](#-getting-started)
- [License & Copyright](#-license--copyright)

---

## 💡 Project Overview

### 🚨 The Problem
Job seekers, students, and career changers often struggle with interview anxiety, lack of structured practice, and the absence of objective, actionable feedback. Traditional mock interviews require human peers or mentors, which are not always available or scalable.

### 🎯 The Aim
To democratize interview preparation by providing a 24/7, highly intelligent, and multimodal AI coach that simulates real-world interview scenarios based on a user's actual resume and target role.

### 🚀 Proposed Solution
**PrepMaster AI** is a Progressive Web App (PWA) that leverages the Google Gemini Live API to conduct real-time voice and video mock interviews. It parses user resumes, generates tailored questions, monitors response times, and provides a detailed dashboard with exportable performance metrics.

---

## ✨ Key Features
- **📄 Smart Resume Parsing:** Upload a PDF/TXT or manually enter details. The AI extracts skills, projects, and experience.
- **🤖 Multimodal AI Interviewer:** Real-time voice conversations using Gemini's Live API.
- **⏱️ Live Metrics:** Tracks response times and simulates behavioral analysis.
- **📊 Performance Dashboard:** Visualizes progress over time using Recharts (Radar, Line, Area charts).
- **📥 Exportable Reports:** Download session data as Excel (`.xlsx`) or PDF (`.pdf`) files.
- **📱 PWA Ready:** Installable on Desktop, iOS, and Android for a native app experience.

---

## 👥 Who Benefits?
- **Recent Graduates:** Building confidence for their first professional interviews.
- **Career Changers:** Practicing how to pivot their past experience to new roles.
- **Senior Professionals:** Refining their executive presence and concise communication.
- **Educators & Bootcamps:** Providing a scalable practice tool for their students.

---

## 🏗️ Architecture & Data Flow

PrepMaster AI uses a **Serverless Architecture**. The React frontend communicates directly with Firebase (BaaS) for state/storage and the Gemini API for AI processing.

```text
+-----------------------------------------------------------------+
|                         USER DEVICE                             |
|  +-----------------------------------------------------------+  |
|  |                    PrepMaster AI (PWA)                    |  |
|  |  [ Dashboard ]  [ Profile ]  [ Resume ]  [ Interview ]    |  |
|  +-----------------------------------------------------------+  |
+--------+-----------------------+-----------------------+--------+
         |                       |                       |
         | (Auth & DB)           | (Media/Files)         | (WebSockets/REST)
         v                       v                       v
+--------------------+  +--------------------+  +--------------------+
|    FIREBASE        |  |    FIREBASE        |  |   GOOGLE GEMINI    |
|  AUTHENTICATION    |  |     STORAGE        |  |      LIVE API      |
|  & FIRESTORE       |  |                    |  |                    |
|--------------------|  |--------------------|  |--------------------|
| - User Profiles    |  | - Resume PDFs      |  | - Resume Parsing   |
| - Session History  |  | - Profile Pics     |  | - Question Gen.    |
| - Analytics Data   |  |                    |  | - Real-time Voice  |
+--------------------+  +--------------------+  +--------------------+
```

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 (UI Library)
- Vite (Build Tool & Bundler)
- Tailwind CSS v4 (Styling)
- Framer Motion (Animations)
- Recharts (Data Visualization)
- Lucide React (Icons)

**Backend / Services:**
- Firebase Authentication (Google OAuth)
- Firebase Firestore (NoSQL Database)
- Google GenAI SDK (`@google/genai`)

**Utilities:**
- `pdfjs-dist` (PDF Parsing)
- `exceljs` & `jspdf` (Report Generation)
- `vite-plugin-pwa` (Progressive Web App)

---

## 🔄 SDLC Stages

1. **📝 Requirement Analysis:** Identified the need for accessible, AI-driven interview practice.
2. **🎨 Design:** Created a dark-mode, modern UI with Tailwind CSS and Framer Motion. Designed the Firestore database schema (`users` -> `sessions`).
3. **💻 Development:** Implemented Firebase Auth, PDF parsing, Gemini API integration, and the Recharts dashboard.
4. **🧪 Testing:** Verified real-time audio streaming, responsive design across mobile/desktop, and PWA installation.
5. **🚀 Deployment:** Configured for deployment on Google Cloud Run / Firebase Hosting.

---

## 📁 Folder Structure

```text
prepmaster-ai/
├── public/                 # Static assets (PWA icons, favicon)
│   └── icon.svg
├── src/
│   ├── components/         # React UI Components
│   │   ├── Dashboard.tsx   # Analytics and charts
│   │   ├── InterviewSession.tsx # Live Gemini API integration
│   │   ├── Profile.tsx     # User settings & manual entry
│   │   └── ResumeUpload.tsx# PDF parsing logic
│   ├── services/           # External API logic
│   │   └── gemini.ts       # Gemini AI prompts and config
│   ├── App.tsx             # Main layout and routing
│   ├── firebase.ts         # Firebase initialization & error handling
│   ├── index.css           # Tailwind directives & global styles
│   └── main.tsx            # React entry point & PWA registration
├── .env.example            # Environment variables template
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
└── vite.config.ts          # Vite & PWA configuration
```

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key
- A Firebase Project

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/prepmaster-ai.git
cd prepmaster-ai
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Variables
Create a `.env` file in the root directory and add your keys:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration (If using standard .env setup)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
*(Note: If the project uses `firebase-applet-config.json`, ensure that file is present in the `src/` directory).*

### 5. Run the Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### 6. Build for Production
```bash
npm run build
npm run preview
```

---

## 📜 License & Copyright

**Copyright © 2026 PrepMaster AI.** All rights reserved.

This project is licensed under the **MIT License**.

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

<div align="center">
  <p>Built with ❤️ using React, Firebase, and Google Gemini.</p>
</div>

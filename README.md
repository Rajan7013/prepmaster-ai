<div align="center">
  
  # 🎯 PrepMaster AI
  **Professional Multimodal Interview Coach**

  [![React](https://img.shields.io/badge/React-19.0-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
  [![Firebase](https://img.shields.io/badge/Firebase-12.0-FFCA28.svg?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
  [![Gemini AI](https://img.shields.io/badge/Gemini_AI-Live_API-8E75B2.svg?style=for-the-badge&logo=google)](https://ai.google.dev/)

  *Master your interviews with real-time AI feedback, adaptive difficulty, quiz modes, and professional performance reports.*

</div>

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Features](#-key-features)
- [Deployment](#-deployment)
- [Who Benefits?](#-who-benefits)
- [Architecture & Data Flow](#-architecture--data-flow)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
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
- **📈 Adaptive Difficulty:** Choose between **Basic**, **Intermediate**, and **Advanced** levels to match your experience.
- **🧠 Topic Focus:** Specify skills or topics (e.g., "React", "System Design") for targeted practice.
- **⏱️ Quiz Mode:** Test your quick thinking with 5-second multiple-choice questions.
- **📥 Professional Reports:** Download enhanced PDF and Excel reports with branding, watermarks, and detailed AI analysis.
- **👁️ Report Preview:** Preview your performance metrics before downloading the full report.
- **📊 Performance Dashboard:** Visualizes progress over time using Recharts (Radar, Line, Area charts).
- **📱 PWA Ready:** Installable on Desktop, iOS, and Android for a native app experience.

---

## 🚀 Deployment

PrepMaster AI is optimized for deployment on **Vercel** and **Google Cloud Run**.

**Live Demo:** [https://ai-interview-coach-nine-chi.vercel.app/](https://ai-interview-coach-nine-chi.vercel.app/)

### 🔒 Security & Privacy
- **Authentication Required:** All features, including interview sessions and performance reports, require a secure Google Sign-In.
- **Private Data:** Your interview videos and reports are strictly private. They are stored in Firebase Storage and Firestore with robust security rules that ensure only you can access your own data.
- **Environment Variables:** All sensitive API keys and configurations are managed via environment variables, ensuring they are never exposed in the source code.

### Deployment Steps (Vercel)
1. Push your code to a GitHub repository.
2. Connect your repository to Vercel.
3. Add the required environment variables (see below) in the Vercel project settings.
4. Deploy!

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

## 📁 Folder Structure

```text
prepmaster-ai/
├── public/                 # Static assets (PWA icons, favicon)
├── src/
│   ├── components/         # React UI Components
│   │   ├── Dashboard.tsx   # Analytics and charts
│   │   ├── InterviewSession.tsx # Live Gemini API integration
│   │   ├── Profile.tsx     # User settings & manual entry
│   │   └── ResumeUpload.tsx# PDF parsing logic
│   ├── services/           # External API logic
│   │   ├── gemini.ts       # Gemini AI prompts and config
│   │   └── reports.ts      # PDF/Excel generation logic
│   ├── App.tsx             # Main layout and routing
│   ├── firebase.ts         # Firebase initialization & error handling
│   ├── index.css           # Tailwind directives & global styles
│   └── main.tsx            # React entry point & PWA registration
├── .env.example            # Environment variables template
├── firestore.rules         # Firestore security rules
├── storage.rules           # Firebase Storage security rules
├── index.html              # HTML template
├── package.json            # Dependencies and scripts
├── tailwind.config.js      # Tailwind configuration
├── vite.config.ts          # Vite & PWA configuration
└── README.md               # Documentation
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
Create a `.env` file in the root directory and add your keys. You can use the Gemini API key provided by the user: `AIzaSyCCHXu4H-kIB731-IYTxKbD536I3djRHDc`.

```env
# Google Gemini API Key
VITE_GEMINI_API_KEY=AIzaSyCCHXu4H-kIB731-IYTxKbD536I3djRHDc

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyBW5PVdidbuD-fWmQtXZmo6YXsEfp-7ku4
VITE_FIREBASE_AUTH_DOMAIN=amazing-centaur-462112-n5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=amazing-centaur-462112-n5
VITE_FIREBASE_STORAGE_BUCKET=amazing-centaur-462112-n5.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=468903270383
VITE_FIREBASE_APP_ID=1:468903270383:web:8d9fb1266b7e483896c81a
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
```

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

<div align="center">
  <p>Built with ❤️ using React, Firebase, and Google Gemini.</p>
</div>

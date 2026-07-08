# BigQuery Release Pulse 🚀

A modern, responsive web dashboard built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript** that aggregates, filters, and shares Google Cloud BigQuery release notes in real-time.

---

## ✨ Features

- 🔄 **Live RSS Feed parsing**: Automatically fetches BigQuery release notes XML, parsing nested HTML content with `BeautifulSoup` to break down aggregated updates into individual cards.
- ⚡ **In-memory Caching**: Implements a 10-minute cache mechanism to speed up request response times and prevent rate-limiting.
- 🎨 **Premium Modern Design**: Supports full **Dark & Light Mode** with aesthetic radial ambient glows, keyframe micro-animations, skeleton loaders, and floating graphics.
- 🔍 **Real-Time Search & Filtering**: Instant title, date, and description search alongside category tag chips (Feature, Change, Deprecation, Note).
- 🐦 **Mock Tweet Composer**: Selects any release item, processes its text limits, displays an SVG circular character progress indicator (bound to 280 characters), and automatically links to Twitter's intent composer.

---

## 📁 Directory Structure

```text
bq-releases-notes/
│
├── static/
│   ├── css/
│   │   └── style.css      # Core styles, transitions, responsive layouts, themes
│   └── js/
│       └── app.js         # API handlers, search/filter logic, tweet validation
│
├── templates/
│   └── index.html         # Main dashboard layout and modal structures
│
├── app.py                 # Flask server pipeline & Atom XML parsing engine
├── requirements.txt       # Dependencies (Flask, requests, beautifulsoup4)
├── .gitignore             # Git exclusion file
└── README.md              # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have **Python 3.8+** installed on your system.

### Step 1: Clone & Navigate to project directory
```bash
cd bq-releases-notes
```

### Step 2: Set up a Virtual Environment (Optional but recommended)
On Windows (PowerShell):
```powershell
python -m venv venv
.\venv\Scripts\activate
```
On Linux/macOS:
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python app.py
```

### Step 5: Open in Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

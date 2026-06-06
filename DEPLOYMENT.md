# GST Summary Creator Web Deployment Guide

Since the web application is written in Python (Flask), it can be deployed to the cloud easily. 

Below are step-by-step instructions for the two most popular, free/low-cost platforms for deploying Flask applications: **Render** (Recommended, Linux-based, highly automated) and **PythonAnywhere** (Easiest setup, Python-specific).

---

## ☁️ Option A: Deploying on Render (Recommended)

Render is a modern cloud hosting platform. It connects to your GitHub repository and automatically deploys the application when you push updates.

### Step 1: Push Code to GitHub
1. Create a repository on GitHub (e.g., `gst-summary-creator`).
2. Initialize Git in your local folder and push your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for web deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```
   > [!NOTE]
   > The deployment files `requirements.txt` and `Procfile` have already been created in your workspace and will be pushed automatically.

### Step 2: Set up a Render Account
1. Go to [render.com](https://render.com) and sign up (you can sign in with your GitHub account).
2. Click the **New +** button in the dashboard and select **Web Service**.
3. Connect your GitHub account and select your `gst-summary-creator` repository.

### Step 3: Configure Web Service
Configure the web service using these settings:
*   **Name:** `gst-summary-creator` (or any name you prefer)
*   **Region:** Select the region closest to you (e.g., Singapore for Asia, Oregon for US West)
*   **Branch:** `main`
*   **Runtime:** `Python`
*   **Build Command:** `pip install -r requirements.txt`
*   **Start Command:** `gunicorn app:app`
*   **Instance Type:** Select the **Free** tier.

### Step 4: Add API Key (Optional)
If you want to use a custom OCR.space key instead of the default free key:
1. In the Render service settings, navigate to the **Environment** tab.
2. Add an Environment Variable:
   - Key: `OCR_API_KEY`
   - Value: *[Your OCR.space free API Key]*
3. Click **Save Changes**.

Click **Create Web Service**. Render will build the container, install requirements, and deploy the application. It will provide a public web URL (e.g., `https://gst-summary-creator.onrender.com`).

---

## 🐍 Option B: Deploying on PythonAnywhere

PythonAnywhere is a specialized Python hosting platform. It has a very stable free tier and does not require Git/GitHub to upload files.

### Step 1: Sign Up
1. Create a free account at [pythonanywhere.com](https://www.pythonanywhere.com/).
2. Once logged in, go to the **Files** tab.

### Step 3: Upload Files
1. Create a directory named `gst-summary-creator`.
2. Upload the following files from your local workspace:
   - `app.py`
   - `parser.py`
   - `requirements.txt`
   - `templates/index.html` (create folders as needed)
   - `static/css/style.css`
   - `static/js/app.js`

### Step 3: Set up Virtual Environment and Install Dependencies
1. Go to the **Consoles** tab and open a new **Bash** console.
2. Create a virtual environment and install the requirements:
   ```bash
   mkvirtualenv --python=/usr/bin/python3.10 gst-env
   pip install -r requirements.txt
   ```

### Step 4: Configure Web App
1. Go to the **Web** tab on PythonAnywhere.
2. Click **Add a new web app**.
3. Choose **Manual configuration** (do not select Flask, as we are using a virtual environment) and select **Python 3.10**.
4. Scroll down to the **Virtualenv** section and enter the path:
   `/home/YOUR_USERNAME/.virtualenvs/gst-env`
5. Under **Code**, set the Source Directory to:
   `/home/YOUR_USERNAME/gst-summary-creator`

### Step 5: Edit the WSGI Configuration
1. Under **Code**, click the link to edit the **WSGI configuration file** (e.g., `/var/www/your_username_pythonanywhere_com_wsgi.py`).
2. Delete everything in the file and write:
   ```python
   import sys
   import os

   path = '/home/YOUR_USERNAME/gst-summary-creator'
   if path not in sys.path:
       sys.path.append(path)

   os.environ['OCR_API_KEY'] = 'helloworld' # Or your own key

   from app import app as application
   ```
3. Save the file.
4. Go back to the **Web** tab and click **Reload**. Your site will be live at `http://YOUR_USERNAME.pythonanywhere.com`.

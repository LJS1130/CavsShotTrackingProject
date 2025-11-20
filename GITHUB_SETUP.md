# Connecting to GitHub with a Different Account

Follow these steps to connect your code to GitHub using a different account than your default one.

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and **log in with the account you want to use**
2. Click the **"+"** icon in the top right → **"New repository"**
3. Name it (e.g., `cavs-shot-tracker`)
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have files)
6. Click **"Create repository"**

## Step 2: Initialize Git (if not already done)

Open PowerShell in your project folder (`C:\Users\ljuliano\Box\Personal\cavs`) and run:

```powershell
git init
```

## Step 3: Configure Git for This Repository Only

Set the git config **only for this repository** (not globally):

```powershell
git config user.name "Your GitHub Username"
git config user.email "your-email@example.com"
```

Replace with the username and email of the GitHub account you want to use.

## Step 4: Add Your Files

```powershell
git add .
```

## Step 5: Make Your First Commit

```powershell
git commit -m "Initial commit"
```

## Step 6: Connect to GitHub

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

For example:
```powershell
git remote add origin https://github.com/john-doe/cavs-shot-tracker.git
```

## Step 7: Push Your Code

When you push, GitHub will ask for credentials. You have two options:

### Option A: Use Personal Access Token (Recommended)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **"Generate new token (classic)"**
3. Give it a name like "Cavs Project"
4. Select scopes: check **"repo"** (gives full repository access)
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

When you push, use:
- **Username**: Your GitHub username
- **Password**: Paste the token (not your actual password)

```powershell
git push -u origin main
```

If your default branch is `master` instead of `main`:
```powershell
git branch -M main
git push -u origin main
```

### Option B: Use GitHub CLI (Alternative)

If you have GitHub CLI installed:
```powershell
gh auth login
```
Follow the prompts to authenticate with your different account.

## Step 8: Verify

Go to your GitHub repository page - you should see all your files!

---

## Troubleshooting

### "Authentication failed" error
- Make sure you're using a **Personal Access Token**, not your password
- Check that the token has "repo" scope enabled
- Verify your username is correct

### "Remote origin already exists"
If you already added a remote, remove it first:
```powershell
git remote remove origin
```
Then add it again with the correct URL.

### Want to use SSH instead?
If you prefer SSH keys:
1. Generate an SSH key for this account
2. Add it to your GitHub account
3. Use SSH URL: `git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git`

---

## Quick Reference Commands

```powershell
# Initialize git
git init

# Set local config (for this repo only)
git config user.name "YourUsername"
git config user.email "your-email@example.com"

# Add files
git add .

# Commit
git commit -m "Initial commit"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push
git push -u origin main
```

Once your code is on GitHub, you can proceed with deployment using Railway or Render! 🚀


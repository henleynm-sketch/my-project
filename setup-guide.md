# Microsoft 365 MCP Server — Setup Guide for Henley Contracting

This guide walks you through connecting Claude Code to your Microsoft 365 account
so it can read/send emails, access Excel files on OneDrive, and manage your calendar.

## Step 1: Register an Azure AD App

1. Go to https://portal.azure.com
2. Navigate to **Microsoft Entra ID** → **App registrations** → **New registration**
3. Name it something like `Henley-Claude-Code`
4. Under "Supported account types", select:
   - **Accounts in this organizational directory only** (if you have a business M365 account)
   - OR **Accounts in any organizational directory and personal Microsoft accounts** (if using a personal account)
5. Leave Redirect URI blank for now, click **Register**
6. Copy these two values — you'll need them:
   - **Application (client) ID**
   - **Directory (tenant) ID**

## Step 2: Set API Permissions

In your new app registration, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.

Add these permissions:

| Permission | What it does |
|---|---|
| `User.Read` | Read your profile |
| `Mail.ReadWrite` | Read and manage your email |
| `Mail.Send` | Send emails on your behalf |
| `Calendars.ReadWrite` | Read and manage your calendar |
| `Files.ReadWrite` | Read and manage your OneDrive files |
| `Contacts.Read` | Read your contacts |
| `Sites.ReadWrite.All` | Read and manage SharePoint sites (for estimating templates) |

Click **Grant admin consent** if you're the admin of your M365 tenant.

## Step 3: Update Claude Code Config

Open `.claude/settings.json` in this project and replace the placeholder values:

```json
{
  "mcpServers": {
    "ms365": {
      "command": "npx",
      "args": ["-y", "@softeria/ms-365-mcp-server", "--org-mode"],
      "env": {
        "MS365_MCP_CLIENT_ID": "paste-your-client-id-here",
        "MS365_MCP_TENANT_ID": "paste-your-tenant-id-here"
      }
    }
  }
}
```

If you're using a **personal Microsoft account** (not business M365), remove `"--org-mode"` from the args.

## Step 4: Authenticate

Run this in your terminal:

```bash
npx -y @softeria/ms-365-mcp-server --login
```

A browser window will open. Sign in with your Microsoft account and approve the permissions.
Your token will be cached securely in your OS credential store — you won't need to do this again
unless the token expires.

## Step 5: Test It

Start a new Claude Code session in this project. Try asking:
- "Show me my latest emails"
- "What's on my calendar this week?"
- "List files in my OneDrive"

If it works, you're connected.

## Troubleshooting

- **"No tools available"** — Make sure you ran `--login` first and the auth succeeded
- **"Permission denied"** — Go back to Azure and verify you granted admin consent on all permissions
- **Token expired** — Run `npx -y @softeria/ms-365-mcp-server --login` again
- **Personal vs Work account issues** — If using a personal account, set tenant ID to `consumers` instead of your directory ID

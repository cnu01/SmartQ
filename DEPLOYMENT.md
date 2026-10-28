# Smart'Q — Deploy on Render + Netlify

This guide deploys:

| Service | Platform | Role |
|---------|----------|------|
| **Frontend** | Netlify | React static site (`frontend/dist`) |
| **Backend API** | Render Web Service | Node.js + Socket.IO (port from `PORT`) |
| **ML service** | Render Web Service | Python Flask + gunicorn |

MongoDB stays on **MongoDB Atlas** (connection string in Render env).

---

## 1. Prerequisites

- GitHub repo pushed with this project  
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster + connection string  
- (Optional) SMTP credentials for OTP / queue emails  

---

## 2. Deploy backend + ML on Render (Blueprint)

1. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.  
2. Connect your GitHub repo.  
3. Render reads **`render.yaml`** at the repo root and creates:
   - `smartq-ml` (Python, `backend/ml`)
   - `smartq-backend` (Node, `backend`)

4. When prompted, set **secret / manual** environment variables:

### `smartq-backend`

| Variable | Example |
|----------|---------|
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/smartq` |
| `JWT_ACCESS_SECRET` | long random string |
| `FRONTEND_ORIGINS` | `https://your-site.netlify.app,http://localhost:3000` |

Optional SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

`ML_SERVICE_URL` is wired from the ML service **`RENDER_EXTERNAL_URL`** automatically.

### `smartq-ml`

| Variable | Example |
|----------|---------|
| `FRONTEND_ORIGINS` | Same Netlify URL as above (comma-separated if multiple) |

5. Wait for both services to go **Live**.  
6. Note the backend URL, e.g. `https://smartq-backend-xxxx.onrender.com`.  
7. Test: `GET https://<backend>/api/health`

### After deploy — seed (optional)

Render shell or one-off job:

```bash
cd backend && npm run seed:demo
```

Requires `MONGO_URI` and running ML URL for training.

### ML cold start

Free tier ML may sleep. First request can take 30–60s. Train models via seed or `POST /train` on the ML service.

---

## 3. Deploy frontend on Netlify

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import from Git**.  
2. Select the repo.  
3. Build settings (also in **`netlify.toml`**):

| Setting | Value |
|---------|--------|
| Base directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `frontend/dist` |

4. **Environment variables** (Site configuration → Environment variables):

| Key | Value |
|-----|--------|
| `REACT_APP_API_URL` | `https://<your-render-backend>.onrender.com` |
| `REACT_APP_ML_URL` | `https://<your-render-ml>.onrender.com` (optional) |

5. Deploy.  
6. Copy your Netlify URL, e.g. `https://your-site.netlify.app`.  
7. Update **`FRONTEND_ORIGINS`** on **both** Render services to include that URL (comma-separated).  
8. Redeploy backend if you changed CORS origins.

---

## 4. CORS & Socket.IO

- Backend allows origins in `FRONTEND_ORIGINS` plus `*.netlify.app`, `*.vercel.app`.  
- Frontend Socket.IO connects to **`REACT_APP_API_URL`** (same host as API).  
- No trailing slash on URLs in env vars.

---

## 5. Local vs production

| | Local | Production |
|---|--------|--------------|
| Frontend | `npm start` → :3000 | Netlify |
| Backend | `npm run dev` → :5000 | Render |
| ML | `python3 ml_service.py` → :5001 | Render gunicorn |
| API URL | `frontend/.env` | Netlify `REACT_APP_API_URL` |

---

## 6. Manual Render setup (without Blueprint)

### ML service

- **Root directory:** `backend/ml`  
- **Build:** `pip install -r requirements.txt`  
- **Start:** `gunicorn --bind 0.0.0.0:$PORT --timeout 120 --workers 1 ml_service:app`  
- **Runtime:** Python 3.11  

### Backend service

- **Root directory:** `backend`  
- **Build:** `npm install`  
- **Start:** `npm start`  
- **Runtime:** Node 20  
- **Env:** `ML_SERVICE_URL` = full HTTPS URL of ML service  

---

## 7. Checklist

- [ ] MongoDB Atlas IP allowlist includes `0.0.0.0/0` (or Render egress)  
- [ ] `JWT_ACCESS_SECRET` set on backend  
- [ ] Netlify `REACT_APP_API_URL` points to Render backend  
- [ ] `FRONTEND_ORIGINS` includes Netlify URL on backend + ML  
- [ ] `/api/health` OK from browser or curl  
- [ ] Admin login works on Netlify site  
- [ ] ML `/health` shows `trained` after seed/train  

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| API calls go to localhost | Set Netlify `REACT_APP_API_URL` and **redeploy** frontend |
| CORS error | Add Netlify URL to `FRONTEND_ORIGINS` on backend |
| 404 on refresh | Netlify redirects in `netlify.toml` (SPA) |
| ML predictions empty | Wake ML service; run `npm run seed:demo` |
| Render build fails on ML | Confirm Python 3.11 and `requirements.txt` |

---

*See also `docs/SmartQ-Complete-Documentation.pdf` for full product documentation.*

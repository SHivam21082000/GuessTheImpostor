# Deploying for free

| Part | Host | Free plan notes |
| --- | --- | --- |
| Website (`apps/web`) | Vercel Hobby | Always on, global CDN |
| Game server (`apps/server`) | Render Free | Sleeps after 15 min with no traffic; the first visit after that takes about a minute to wake it up |

## 1. Game server on Render

1. Sign in at https://render.com with GitHub.
2. Click **New → Blueprint** and pick the `GuessTheImpostor` repo. Render reads `render.yaml`.
3. When asked for `CORS_ORIGIN`, enter `*` for now. You'll change it in step 3.
4. Click **Apply**. When the deploy is live, copy the URL, e.g. `https://guess-the-impostor-server.onrender.com`.
5. Open `<that URL>/health` in a browser. You should see `{"ok":true,...}`.

## 2. Website on Vercel

1. Sign in at https://vercel.com with GitHub.
2. Click **Add New → Project** and import `GuessTheImpostor`.
3. Set **Root Directory** to `apps/web`. The framework (Next.js) and pnpm are detected automatically.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SERVER_URL` = your Render URL from step 1, without a trailing slash
5. Click **Deploy**. You get a URL like `https://guess-the-impostor.vercel.app`.

## 3. Lock the server to your website

In Render, open the service, go to **Environment**, and set `CORS_ORIGIN` to your Vercel URL
(e.g. `https://guess-the-impostor.vercel.app`). Save, and Render redeploys.

## Updating

Push to `main`, and both Vercel and Render redeploy automatically.

## Notes

- Live rooms are held in server memory. A restart or redeploy ends games in progress.
- Render's free plan includes 750 instance hours a month, enough to run one service all month.
- The home page connects to the server as soon as it opens, so it starts waking up while players type their names.

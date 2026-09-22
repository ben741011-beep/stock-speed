This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 外部淨資產API

其他網站的後端可以唯讀取得「0050＋微臺」目前淨資產。請在伺服器設定：

- `EXTERNAL_ASSET_API_KEY`：至少32字元的隨機密鑰。
- `EXTERNAL_ASSET_OWNER_ID`：要讀取資料的登入帳號ID，可在登入後由 `/api/auth/session` 的 `user.id` 取得。

請求方式：

```http
GET /api/external/spot-futures/net-assets
Authorization: Bearer <EXTERNAL_ASSET_API_KEY>
```

成功回應：

```json
{
  "netAssets": 1051380,
  "currency": "TWD",
  "updatedAt": "2026-09-21T00:00:00.000Z"
}
```

這個金鑰只能放在呼叫端網站的伺服器環境變數，不可寫入瀏覽器JavaScript或任何 `NEXT_PUBLIC_` 變數。回應禁止快取；端點只讀取資料，不會更新行情或寫入MongoDB。

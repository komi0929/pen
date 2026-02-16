import { BetaAnalyticsDataClient } from "@google-analytics/data";

// GA4 Data API レスポンスの型
export interface GAReport {
  overview: {
    pageViews: number;
    activeUsers: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number; // 秒
  };
  overviewYesterday: {
    pageViews: number;
    activeUsers: number;
    sessions: number;
    newUsers: number;
    avgSessionDuration: number;
  };
  topPages: {
    path: string;
    pageViews: number;
    activeUsers: number;
  }[];
}

/**
 * GA4 Data API クライアント初期化
 * 環境変数が設定されていない場合は null を返す
 */
function createGAClient(): BetaAnalyticsDataClient | null {
  const clientEmail = process.env.GA_CLIENT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY;

  if (!clientEmail || !privateKey) return null;

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
  });
}

/**
 * GA4 レポートを取得
 * 今日 vs 昨日の比較データ + ページ別PVランキングを返す
 */
export async function getGAReport(): Promise<GAReport | null> {
  const client = createGAClient();
  const propertyId = process.env.GA_PROPERTY_ID;

  if (!client || !propertyId) return null;

  try {
    // 今日のサマリー
    const [todayResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "today", endDate: "today" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "newUsers" },
        { name: "averageSessionDuration" },
      ],
    });

    // 昨日のサマリー
    const [yesterdayResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "yesterday", endDate: "yesterday" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "newUsers" },
        { name: "averageSessionDuration" },
      ],
    });

    // ページ別PV（今日、Top 10）
    const [pagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: "today", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
      orderBys: [
        {
          metric: { metricName: "screenPageViews" },
          desc: true,
        },
      ],
      limit: 10,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseMetrics = (row: any) => ({
      pageViews: parseInt(row?.metricValues?.[0]?.value ?? "0", 10),
      activeUsers: parseInt(row?.metricValues?.[1]?.value ?? "0", 10),
      sessions: parseInt(row?.metricValues?.[2]?.value ?? "0", 10),
      newUsers: parseInt(row?.metricValues?.[3]?.value ?? "0", 10),
      avgSessionDuration: parseFloat(row?.metricValues?.[4]?.value ?? "0"),
    });

    const todayRow = todayResponse.rows?.[0];
    const yesterdayRow = yesterdayResponse.rows?.[0];

    const topPages = (pagesResponse.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "/",
      pageViews: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
      activeUsers: parseInt(row.metricValues?.[1]?.value ?? "0", 10),
    }));

    return {
      overview: parseMetrics(todayRow),
      overviewYesterday: parseMetrics(yesterdayRow),
      topPages,
    };
  } catch (err) {
    console.error("[GA] Failed to fetch report:", err);
    return null;
  }
}

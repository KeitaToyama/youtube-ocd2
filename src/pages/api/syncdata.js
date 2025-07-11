import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // 必要に応じて調整
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stateData = req.body.data; // クライアントからの配列
  if (!Array.isArray(stateData)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // 1. Supabaseから既存IDを取得（videoIdのみ）
  const { data: existingData, error } = await supabase
    .from("youtubeocd2")
    .select("videoId");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const existingIds = new Set(existingData.map((item) => item.videoId));

  // 2. クライアントデータから既にあるIDを除いた新規データを抽出
  const toInsert = stateData.filter((item) => !existingIds.has(item.videoId));

  // 3. 欠損データの判定（stateにない、または "Private video" とマークされたID）
  const stateIds = new Set(stateData.map((item) => item.videoId));
  const privateIds = new Set(
    stateData
      .filter((item) => item.videoTitle === "Private video")
      .map((item) => item.videoId)
  );

  // DB全体ではなく既存データに限定する場合はここで `select("*")` に変更が必要
  const { data: fullDbData, error: fullDbError } = await supabase
    .from("youtubeocd2")
    .select("*");

  if (fullDbError) {
    return res.status(500).json({ error: fullDbError.message });
  }

  const missingInState = fullDbData.filter(
    (item) => !stateIds.has(item.videoId) || privateIds.has(item.videoId)
  );

  // 4. 新規データを挿入（upsertではなくinsertのみ）
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("youtubeocd2")
      .upsert(toInsert);

    if (insertError) {
      console.error(JSON.stringify(insertError));
      return res.status(500).json({ error: insertError.message });
    }
  }

  // 5. 欠損データをレスポンス
  return res.status(200).json({ missingData: missingInState });
}

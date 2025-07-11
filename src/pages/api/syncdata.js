import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // 必要に応じて増やす（例: '10mb', '20mb'）
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stateData = req.body.data; // クライアントから受け取った配列
  if (!Array.isArray(stateData)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // 1. Supabaseから全データ取得（フィルタ条件あれば適宜）
  const { data: dbData, error } = await supabase
    .from("youtubeocd2")
    .select("*");
  if (error) return res.status(500).json({ error: error.message });

  // 2. 主キーなどで比較するためのSetを作成
  const stateIds = new Set(stateData.map((item) => item.videoId));
  const statePrivateids = new Set(
    stateData
      .filter((item) => item.videoTitle === "Private video")
      .map((item) => item.videoId)
  );
  // console.log(statePrivateids);
  const dbIds = new Set(dbData.map((item) => item.videoId));

  // 3. 新規追加対象を抽出（stateにはあるがDBにはないもの）
  const toInsert = stateData.filter((item) => !dbIds.has(item.videoId));

  // 4. 欠損データを抽出（DBにはあるがstateにはないもの）
  const missingInState = dbData.filter(
    (item) => !stateIds.has(item.videoId) || statePrivateids.has(item.videoId)
  );
  // console.log(missingInState);
  // 5. Supabaseに新規データを挿入
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("youtubeocd2")
      .upsert(toInsert);
    // if (insertError) console.log(JSON.stringify(insertError));
    // return res.status(500).json({ error: insertError });
  }

  // 6. 欠損データをレスポンス
  return res.status(200).json({ missingData: missingInState });
}

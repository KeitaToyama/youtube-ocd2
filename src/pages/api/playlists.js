import { getSession } from "next-auth/react";
import { google } from "googleapis";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  // 再生リスト一覧を取得
  const playlistsRes = await youtube.playlists.list({
    part: ["id", "snippet", "status"],
    mine: true,
    maxResults: 50,
  });

  res.status(200).json(playlistsRes.data);
}

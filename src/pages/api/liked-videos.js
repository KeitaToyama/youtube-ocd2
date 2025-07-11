import { getSession } from "next-auth/react";
import { google } from "googleapis";
import { scanlimit } from "../../../number";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    let allItems = [];
    let nextPageToken = null;

    do {
      const response = await youtube.videos.list({
        part: ["snippet", "contentDetails"],
        myRating: "like",
        maxResults: 50, // 上限
        pageToken: nextPageToken || undefined,
      });

      allItems = allItems.concat(response.data.items);
      nextPageToken = response.data.nextPageToken;

      // 上限を設定したい場合はここで break
      // if (allItems.length >= 100) break;
      if (allItems.length >= scanlimit) break;
    } while (nextPageToken);

    res.status(200).json({ items: allItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

import { getSession } from "next-auth/react";
import { google } from "googleapis";
import { scanlimit } from "../../../number";

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session?.accessToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { playlistId } = req.query;
  if (!playlistId) {
    return res.status(400).json({ error: "Missing playlistId" });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    const allItems = [];
    let nextPageToken = null;

    do {
      const result = await youtube.playlistItems.list({
        part: ["snippet", "contentDetails"],
        playlistId,
        maxResults: 100,
        pageToken: nextPageToken || undefined,
      });

      allItems.push(...result.data.items);
      nextPageToken = result.data.nextPageToken;
      if (allItems.length >= scanlimit) break;
    } while (nextPageToken);

    res.status(200).json({ items: allItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

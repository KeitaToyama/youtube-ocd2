import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState(null);
  const [activeTitle, setActiveTitle] = useState(null);
  const [allVideos, setAllVideos] = useState([]);
  const [missingVideos, setmissingVideos] = useState([]);

  const handleSync = async () => {
    const res = await fetch("/api/syncdata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: allVideos }),
    });
    const result = await res.json();
    setmissingVideos(result.missingData);
    // console.log("StateにないDBデータ:", result.missingData);
  };

  const fetchPlaylists = async () => {
    const res = await fetch("/api/playlists", {
      cache: "no-store",
    });
    const data = await res.json();
    setPlaylists(data.items);
    setSelectedPlaylistItems(null);
    setActiveTitle(null);
  };

  const fetchPlaylistItems = async (playlistId) => {
    const res = await fetch(`/api/playlist-items?playlistId=${playlistId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data.items || [];
  };

  const fetchLikedVideos = async () => {
    const res = await fetch(`/api/liked-videos`, { cache: "no-store" });
    const data = await res.json();
    return data.items || [];
  };

  const fetchAllVideos = async () => {
    const videoList = [];
    const videoIdSet = new Set();

    // const getVideoId = (item) => item.contentDetails?.videoId || item.id;

    // 1. プレイリスト一覧取得
    const playlistsRes = await fetch("/api/playlists", { cache: "no-store" });
    const playlistsData = await playlistsRes.json();
    setPlaylists(playlistsData.items);

    // 2. 各プレイリストの動画取得
    for (const playlist of playlistsData.items) {
      const items = await fetchPlaylistItems(playlist.id);
      for (const item of items) {
        const vid = item.contentDetails.videoId;
        if (!videoIdSet.has(vid)) {
          videoIdSet.add(vid);
          // videoList.push(item);
          videoList.push({
            videoId: item.contentDetails.videoId,
            videoPublishedAt: item.contentDetails.videoPublishedAt,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails["default"]?.url,
            videoTitle: item.snippet.title,
            videoOwnerChannelId: item.snippet.videoOwnerChannelId,
            videoOwnerChannelTitle: item.snippet.videoOwnerChannelTitle,
          });
        }
      }
    }

    // 3. 高く評価した動画取得
    const likedItems = await fetchLikedVideos();
    for (const item of likedItems) {
      const vid = item.id;
      if (!videoIdSet.has(vid)) {
        videoIdSet.add(vid);
        // videoList.push(item);
        videoList.push({
          videoId: item.id,
          videoPublishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails["default"]?.url,
          videoTitle: item.snippet.title,
          videoOwnerChannelId: item.snippet.channelId,
          videoOwnerChannelTitle: item.snippet.channelTitle,
        });
      }
    }

    // 4. ステート更新＆件数出力
    setAllVideos(videoList);
    // console.log(`✅ ${videoList.length}件の動画を取得しました`);
  };

  const fetchPlaylistItemsAndSet = async (playlistId, title) => {
    const items = await fetchPlaylistItems(playlistId);
    setSelectedPlaylistItems(items);
    setActiveTitle(title);
  };

  const fetchLikedVideosAndSet = async () => {
    const items = await fetchLikedVideos();
    setSelectedPlaylistItems(items);
    setActiveTitle("高く評価した動画");
  };

  return (
    <div className="p-4">
      {status === "loading" ? (
        <p>Loading…</p>
      ) : session ? (
        <>
          <div className="space-x-2 mb-4">
            <button onClick={() => signOut()}>サインアウト</button>
            <button onClick={fetchPlaylists}>再生リストを取得</button>
            <button
              onClick={fetchAllVideos}
              className="bg-green-500 text-white px-2 py-1 rounded text-sm"
            >
              ✅ 全動画一括取得
            </button>
            <button onClick={() => console.log(allVideos)}>
              結果: {allVideos.length.toString()}
            </button>
            <button onClick={handleSync}>送信</button>
          </div>

          <ul className="space-y-2">
            <li className="border p-2 rounded flex justify-between items-center">
              <strong>高く評価した動画</strong>
              <button
                onClick={fetchLikedVideosAndSet}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
              >
                動画を表示
              </button>
            </li>
            {/* {JSON.stringify(missingVideos)} */}
            {missingVideos?.map((video) => (
              <div key={video.videoId} className="video-card">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={video.thumbnail} alt={video.videoTitle} />
                  <h3>{video.videoTitle}</h3>
                </a>
                <p>by {video.videoOwnerChannelTitle}</p>
                <small>
                  {new Date(video.videoPublishedAt).toLocaleDateString()}
                </small>
                <p>{video.description.split("\n")[0]}</p>{" "}
                {/* 最初の行だけ表示 */}
              </div>
            ))}
            {/* {playlists.map((pl) => (
              <li
                key={pl.id}
                className="border p-2 rounded flex justify-between items-center"
              >
                <div>
                  <strong>{pl.snippet.title}</strong> ({pl.status.privacyStatus}
                  )
                </div>
                <button
                  className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                  onClick={() =>
                    fetchPlaylistItemsAndSet(pl.id, pl.snippet.title)
                  }
                >
                  動画を表示
                </button>
              </li>
            ))} */}
          </ul>

          {/* {selectedPlaylistItems && (
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-2">{activeTitle}</h2>
              <ul className="space-y-4">
                {selectedPlaylistItems.map((item) => {
                  const snippet = item.snippet;
                  const title = snippet.title;
                  const thumbnail = snippet.thumbnails?.default?.url;
                  const uploader =
                    snippet.videoOwnerChannelTitle || snippet.channelTitle;
                  const description = snippet.description;

                  return (
                    <li key={item.id} className="border p-4 rounded flex gap-4">
                      <img
                        src={thumbnail}
                        alt="thumbnail"
                        className="w-32 h-auto rounded"
                      />
                      <div>
                        <p className="font-semibold text-lg">{title}</p>
                        <p className="text-sm text-gray-600 mb-1">
                          アップロード者: {uploader}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                          {description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )} */}
        </>
      ) : (
        <button onClick={() => signIn("google")}>Google でログイン</button>
      )}
    </div>
  );
}

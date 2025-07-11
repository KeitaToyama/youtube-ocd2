import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            "openid",
            "profile",
            "email",
            "https://www.googleapis.com/auth/youtube.readonly",
          ].join(" "),
          access_type: "offline", // リフレッシュトークン取得
          prompt: "consent", // 毎回 consent 画面を出す
        },
      },
    }),
  ],
  callbacks: {
    // session に accessToken, refreshToken を含める
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
});

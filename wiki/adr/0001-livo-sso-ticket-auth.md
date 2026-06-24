# Livo SSO 使用一次性 ticket 而非共享 Livo JWT

`pi.gottao.com` 需要让 Livo 用户直接登录使用，同时避免把 Livo JWT 或 server token 暴露给 Pi 前端。决策：使用 Livo 后端签发的一次性短期 SSO ticket，由 Pi 后端通过 server-to-server 校验后设置自己的 HttpOnly Secure cookie。原因：ticket 可单次消费、易轮换和审计，Pi 用户会话与 Livo JWT 解耦，并能在 Pi 侧按 Livo userId 做 workspace/session 隔离。

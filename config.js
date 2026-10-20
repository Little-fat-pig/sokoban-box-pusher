/*
 * 站点级配置（可在“后台”改的就是这里）。
 * 方式一（最简单）：supabaseUrl 留空 → 本地游客 + 本机 localStorage 记录进度，音效/广告用 fallback。
 * 方式二（真·后台 + 账号）：填你的 Supabase 免费库信息，游戏会：
 *   - 拉取 soko_config 表第 1 行覆盖音效/广告（admin.html 改）；
 *   - 用 /functions/v1 下的边缘函数做“邮箱验证码登录 + 跨设备进度同步”。
 * 注意：anon key 可公开；service_role key 只能放在 Supabase 边缘函数环境变量里，绝不放前端。
 */
window.SOKO_CONFIG = {
  // 已接入（2026-10-20 提供）。anon/publishable key 可公开，前端直连即可做“游客进度云端同步”。
  // 注意：云端同步需要先在 Supabase 后台 SQL 编辑器执行 supabase_guest_progress.sql（见同目录）。
  // 若未执行该 SQL，游戏会自动降级为“纯本机游客”，照常可玩、照常记录本机进度。
  supabaseUrl: "https://ycpbakmuosfztsoggilh.supabase.co",
  supabaseAnon: "sb_publishable_BI7ivZskMsslAgooN1ij6Q_0b7RIcS7",
  // 以下为本地兜底默认值（未接 Supabase 时生效）
  fallback: {
    sound: { on: true, volume: 40, tone: 440 },
    adHtml: ""
  }
};

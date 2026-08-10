const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const MB = 1024 * 1024;

const state = {
  language: "zh-CN", settings: {}, user: null, dashboard: null, history: [],
  downloaders: [], devices: [], notifications: [], route: "overview", timer: null,
  trafficRange: "30m", trafficShareMode: "upload", speedShareMode: "upload",
  rankingMode: "upload", trafficHistoryOpen: false, trafficHistoryDate: null,
  trafficHistoryDownloader: null,
};

const translations = {
  "zh-CN": {
    setupTitle:"欢迎使用 Stackstead",setupLead:"只需几步即可完成安全的首次部署。",language:"语言",appName:"站点名称",timezone:"时区",username:"管理员账号",password:"管理员密码",passwordAgain:"确认密码",next:"下一步",createAdmin:"完成初始化",firstDevice:"添加第一台 IPv6 设备",firstDeviceLead:"可选。创建后会生成该设备专用且只显示一次的上报令牌。",deviceNameOptional:"设备名称（可选）",setupDone:"初始化完成",tokenOnlyOnce:"请立即保存 IPv6 上报令牌，它只显示这一次。",noFirstToken:"尚未创建设备，可进入 IPv6 页面后添加。",copy:"复制",enterConsole:"进入中控台",loginTitle:"登录中控台",login:"登录",serviceOnline:"服务运行中",cancel:"取消",confirm:"确认",
    overview:"总览",traffic:"流量面板",ipv6:"IPv6 地址",notifications:"通知服务",settings:"设置",logout:"退出登录",welcome:"Stackstead 运行概况",welcomeLead:"下载器、IPv6 与通知服务的实时状态。",refresh:"刷新",downloadSpeed:"下载速率",uploadSpeed:"上传速率",todayDownload:"今日下载",todayUpload:"今日上传",trafficTrend:"流量趋势",last24h:"最近 24 小时",downloaders:"下载器",noDownloaders:"尚未添加下载器",online:"在线",offline:"离线",waiting:"等待采样",ipv6Devices:"IPv6 设备",active24h:"24 小时活跃",lastChange:"最近变更",never:"暂无",addDownloader:"添加下载器",manageDownloaders:"管理下载器",manageDownloadersLead:"支持 qBittorrent 与 Transmission，可上传自定义展示图。",name:"名称",type:"类型",address:"地址",status:"状态",actions:"操作",edit:"编辑",remove:"删除",image:"图片",enabled:"启用",verifyTls:"验证 HTTPS 证书",baseUrl:"服务地址",rpcPath:"RPC 路径",color:"颜色",save:"保存",uploadImage:"上传图片",passwordKeep:"密码（留空保持不变）",currentAddress:"当前地址",prefix:"/64 前缀",lastReport:"最后上报",changes:"变更次数",noDevices:"还没有 IPv6 上报记录",addDevice:"添加设备",staleAfter:"失联判定（分钟）",stale:"上报中断",reportGuide:"上报方法",reportGuideLead:"每台设备使用独立令牌定时调用 API；令牌可以单独撤销。",history:"历史",barkTargets:"Bark 通知目标",barkLead:"连接已单独部署的 bark-server，并按目标控制事件开关。",addTarget:"添加通知目标",serverUrl:"Bark Server 地址",deviceKey:"设备码",test:"测试",connectionOk:"连接成功",event_ipv6_changed:"IPv6 变更",event_ipv6_missing:"IPv6 丢失",event_ipv6_recovered:"IPv6/上报恢复",event_ipv6_stale:"设备停止上报",event_downloader_offline:"下载器离线",event_downloader_recovered:"下载器恢复",event_daily_traffic:"每日流量",noTargets:"尚未配置 Bark 通知目标",general:"常规设置",security:"安全与上报",rotateToken:"重新生成上报令牌",rotateWarning:"该设备的旧令牌会立即失效。新令牌只显示一次。",saved:"已保存",deleted:"已删除",testSent:"测试通知已发送",copied:"已复制",confirmDelete:"确认删除？",deleteDownloaderText:"相关流量历史也会被删除，此操作不可恢复。",deleteDeviceText:"该设备及其 IPv6 历史将被删除，此操作不可恢复。",deleteTargetText:"该通知目标及事件开关将被删除。",passwordMismatch:"两次输入的密码不一致",requestFailed:"请求失败",loading:"正在加载…",siteSettings:"站点与语言",signOut:"退出登录",deviceHistory:"设备历史",changed:"已变更",unchanged:"未变更",back:"返回",setupHint:"密码至少 10 位。数据只保存在你的持久化目录中。"
  },
  en: {
    setupTitle:"Welcome to Stackstead",setupLead:"A few steps complete a secure first-time setup.",language:"Language",appName:"Site name",timezone:"Timezone",username:"Admin username",password:"Admin password",passwordAgain:"Confirm password",next:"Next",createAdmin:"Complete setup",firstDevice:"Add your first IPv6 device",firstDeviceLead:"Optional. A device-specific report token will be shown once.",deviceNameOptional:"Device name (optional)",setupDone:"Setup complete",tokenOnlyOnce:"Save the IPv6 report token now. It is shown only once.",noFirstToken:"No device was created. You can add one from the IPv6 page.",copy:"Copy",enterConsole:"Enter console",loginTitle:"Sign in",login:"Sign in",serviceOnline:"Service online",cancel:"Cancel",confirm:"Confirm",
    overview:"Overview",traffic:"Traffic",ipv6:"IPv6 addresses",notifications:"Notifications",settings:"Settings",logout:"Sign out",welcome:"Stackstead at a glance",welcomeLead:"Live status for downloaders, IPv6 and notifications.",refresh:"Refresh",downloadSpeed:"Download speed",uploadSpeed:"Upload speed",todayDownload:"Downloaded today",todayUpload:"Uploaded today",trafficTrend:"Traffic trend",last24h:"Last 24 hours",downloaders:"Downloaders",noDownloaders:"No downloaders yet",online:"Online",offline:"Offline",waiting:"Waiting for samples",ipv6Devices:"IPv6 devices",active24h:"Active in 24h",lastChange:"Last change",never:"None",addDownloader:"Add downloader",manageDownloaders:"Manage downloaders",manageDownloadersLead:"Supports qBittorrent and Transmission with custom artwork.",name:"Name",type:"Type",address:"Address",status:"Status",actions:"Actions",edit:"Edit",remove:"Delete",image:"Image",enabled:"Enabled",verifyTls:"Verify HTTPS certificate",baseUrl:"Service URL",rpcPath:"RPC path",color:"Color",save:"Save",uploadImage:"Upload image",passwordKeep:"Password (blank keeps current)",currentAddress:"Current address",prefix:"/64 prefix",lastReport:"Last report",changes:"Changes",noDevices:"No IPv6 reports yet",addDevice:"Add device",staleAfter:"Stale after (minutes)",stale:"Reporting stale",reportGuide:"Report API",reportGuideLead:"Each device calls the API with its own revocable token.",history:"History",barkTargets:"Bark targets",barkLead:"Connect an independently deployed bark-server and choose events per target.",addTarget:"Add target",serverUrl:"Bark Server URL",deviceKey:"Device key",test:"Test",connectionOk:"Connection succeeded",event_ipv6_changed:"IPv6 changed",event_ipv6_missing:"IPv6 missing",event_ipv6_recovered:"IPv6/reporting recovered",event_ipv6_stale:"Device stopped reporting",event_downloader_offline:"Downloader offline",event_downloader_recovered:"Downloader recovered",event_daily_traffic:"Daily traffic",noTargets:"No Bark targets configured",general:"General settings",security:"Security & reporting",rotateToken:"Rotate report token",rotateWarning:"The old token for this device stops working immediately. The new token is shown once.",saved:"Saved",deleted:"Deleted",testSent:"Test notification sent",copied:"Copied",confirmDelete:"Confirm deletion?",deleteDownloaderText:"Related traffic history will also be deleted. This cannot be undone.",deleteDeviceText:"This device and its IPv6 history will be deleted. This cannot be undone.",deleteTargetText:"This target and its event preferences will be deleted.",passwordMismatch:"Passwords do not match",requestFailed:"Request failed",loading:"Loading…",siteSettings:"Site & language",signOut:"Sign out",deviceHistory:"Device history",changed:"Changed",unchanged:"Unchanged",back:"Back",setupHint:"Password must be at least 10 characters. Data stays in your persistent directory."
  }
};

Object.assign(translations["zh-CN"], {
  optionalFeatures:"选择可选功能",optionalFeaturesLead:"未启用的功能不会出现在导航中，也不会运行后台检查任务。",
  enableIpv6:"启用 IPv6 地址监控",enableIpv6Lead:"Reporter 会在目标 NAS 上自动检测公网 IPv6，然后安全地上报给 Stackstead。",
  firstDeviceLead:"创建设备后会生成专用且只显示一次的上报令牌。没有 IPv6 的设备也可以正常上报，地址显示为空。",deviceNameOptional:"第一台设备名称（可选）",
  tokenOnlyOnce:"这是设备身份令牌，不是 IPv6 地址。请立即保存，它只显示这一次。",noFirstToken:"IPv6 已启用。稍后可在 IPv6 页面添加设备。",ipv6Skipped:"IPv6 监控未启用，可稍后在设置中开启。",
  copyToken:"复制令牌",copyCommand:"复制命令",reportCommandLead:"在对应 NAS 下载 Reporter 后，用定时任务执行下面的命令。脚本会自动检测公网 IPv6。",downloadReporter:"下载 Reporter",
  featureSettings:"可选功能",featureSettingsLead:"关闭 IPv6 后会隐藏相关界面、停止后台检查并拒绝设备上报；已有记录不会删除。",welcomeLeadNoIpv6:"下载器与通知服务的实时状态。",copyFailed:"无法自动复制，请长按或选中文本后手动复制。",
  trafficDashboard:"网络流量面板",trafficDashboardLead:"实时查询所有下载器的上下行流量并汇聚展示。",todayTraffic:"今日流量",historyTraffic:"历史累计流量",downloadTraffic:"下载",uploadTraffic:"上传",mostActive:"当前最活跃下载器",noActiveDownloader:"当前没有活动流量",liveSpeed:"实时速率",todayPeak:"今日峰值",trafficChart:"流量图",todayShare:"当日各下载器累计流量",liveShare:"各下载器实时速率",todayRanking:"今日累计流量概览",uploadSort:"上传排序",downloadSort:"下载排序",todayUploadShare:"今日累计上传",todayDownloadShare:"今日累计下载",liveUploadShare:"实时上传速度",liveDownloadShare:"实时下载速度",historyDetail:"历史流量详情",historyDetailLead:"最近 90 天每日累计与 24 小时速率曲线。",allDownloaders:"所有下载器",retainedHistory:"数据库保留范围",trafficSettings:"流量面板设置",trafficSettingsLead:"颜色会同步用于仪表盘、曲线、面积和累计排行榜；上限用于四档仪表盘。",uploadColor:"上传代表色",downloadColor:"下载代表色",uploadMax:"上传仪表盘上限",downloadMax:"下载仪表盘上限",mbPerSecond:"MB/s",downloaderSettings:"下载器管理",noTrafficData:"暂无流量数据",dailyDetail:"当日详情",openHistory:"查看历史",range30m:"30m",range1h:"1h",range6h:"6h",range24h:"24h"
});
Object.assign(translations.en, {
  optionalFeatures:"Choose optional features",optionalFeaturesLead:"Disabled features stay out of navigation and do not run background checks.",
  enableIpv6:"Enable IPv6 monitoring",enableIpv6Lead:"The Reporter detects public IPv6 addresses on each target NAS and securely reports them to Stackstead.",
  firstDeviceLead:"Creating a device generates a dedicated token that is shown once. Devices without IPv6 can still report normally with an empty address.",deviceNameOptional:"First device name (optional)",
  tokenOnlyOnce:"This is the device identity token, not an IPv6 address. Save it now; it is shown only once.",noFirstToken:"IPv6 is enabled. You can add a device later from the IPv6 page.",ipv6Skipped:"IPv6 monitoring is disabled. You can enable it later in Settings.",
  copyToken:"Copy token",copyCommand:"Copy command",reportCommandLead:"Download the Reporter on the target NAS, then schedule the command below. The script detects public IPv6 addresses automatically.",downloadReporter:"Download Reporter",
  featureSettings:"Optional features",featureSettingsLead:"Disabling IPv6 hides its UI, stops its background check, and rejects device reports. Existing history is preserved.",welcomeLeadNoIpv6:"Live status for downloaders and notifications.",copyFailed:"Automatic copy failed. Select the text and copy it manually.",
  trafficDashboard:"Network traffic dashboard",trafficDashboardLead:"Live aggregate upload and download traffic across every downloader.",todayTraffic:"Today's traffic",historyTraffic:"Retained traffic",downloadTraffic:"Download",uploadTraffic:"Upload",mostActive:"Most active downloader",noActiveDownloader:"No active traffic",liveSpeed:"Live speed",todayPeak:"Today's peak",trafficChart:"Traffic chart",todayShare:"Traffic by downloader today",liveShare:"Live speed by downloader",todayRanking:"Today's traffic ranking",uploadSort:"Sort by upload",downloadSort:"Sort by download",todayUploadShare:"Uploaded today",todayDownloadShare:"Downloaded today",liveUploadShare:"Live upload speed",liveDownloadShare:"Live download speed",historyDetail:"Traffic history",historyDetailLead:"Daily totals and 24-hour speed curves retained for 90 days.",allDownloaders:"All downloaders",retainedHistory:"Retained database range",trafficSettings:"Traffic dashboard settings",trafficSettingsLead:"Colors apply to gauges, lines, areas and ranking bars. Limits define the four gauge bands.",uploadColor:"Upload color",downloadColor:"Download color",uploadMax:"Upload gauge maximum",downloadMax:"Download gauge maximum",mbPerSecond:"MB/s",downloaderSettings:"Downloader management",noTrafficData:"No traffic data",dailyDetail:"Daily detail",openHistory:"View history",range30m:"30m",range1h:"1h",range6h:"6h",range24h:"24h"
});

const navItems = [
  ["overview", "overview", "<path d='M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'/>"] ,
  ["traffic", "traffic", "<path d='M4 17V9m5 8V5m6 12v-7m5 7V3'/>"] ,
  ["ipv6", "ipv6", "<path d='M4 12a8 8 0 1 0 16 0 8 8 0 1 0-16 0m0 0h16M12 4c2 2.2 3 4.8 3 8s-1 5.8-3 8c-2-2.2-3-4.8-3-8s1-5.8 3-8'/>"] ,
  ["notifications", "notifications", "<path d='M6 9a6 6 0 0 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8m4 11h4'/>"] ,
  ["settings", "settings", "<path d='M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8m8 4 2-1-2-4-2 .5-2-1L15 3h-6L8 5.5l-2 1L4 6l-2 4 2 2-2 2 2 4 2-.5 2 1L9 21h6l1-2.5 2-1 2 .5 2-4z'/>"]
];

function t(key) { return translations[state.language]?.[key] || translations["zh-CN"][key] || key; }
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]); }
function cookie(name) { return document.cookie.split("; ").find(v => v.startsWith(`${name}=`))?.split("=").slice(1).join("=") || ""; }

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (options.method && options.method !== "GET") headers.set("X-CSRF-Token", decodeURIComponent(cookie("stackstead_csrf")));
  const response = await fetch(path, {...options, headers});
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (response.status === 401 && !path.includes("/login") && !path.includes("/report")) { showLogin(); throw new Error(t("requestFailed")); }
  if (!response.ok) throw new Error(payload.detail || `${t("requestFailed")} (${response.status})`);
  return payload;
}

function toast(message, error = false) {
  const node = $("#toast"); node.textContent = message; node.className = `toast show${error ? " error" : ""}`;
  clearTimeout(node._timer); node._timer = setTimeout(() => node.className = "toast", 2800);
}

function applyTranslations(root = document) {
  $$('[data-i18n]', root).forEach(node => node.textContent = t(node.dataset.i18n));
  document.documentElement.lang = state.language;
}

function applyTrafficTheme() {
  const root = document.documentElement;
  root.style.setProperty("--traffic-upload", state.settings.trafficUploadColor || "#205DA6");
  root.style.setProperty("--traffic-download", state.settings.trafficDownloadColor || "#0E8E3F");
}

async function boot() {
  bindGlobalEvents();
  const bootstrap = await api("/api/bootstrap");
  state.settings = bootstrap.settings;
  state.language = bootstrap.settings.language || "zh-CN";
  applyTranslations(); applyTrafficTheme();
  if (!bootstrap.initialized) return showOnly("setup-screen");
  try {
    const me = await api("/api/me"); state.user = me; state.settings = me.settings; state.language = me.settings.language; showApp();
  } catch { showLogin(); }
}

function bindGlobalEvents() {
  $("#setup-form").addEventListener("submit", setup);
  $("#setup-next").addEventListener("click", () => showSetupStep(2));
  $("#setup-back").addEventListener("click", () => showSetupStep(1));
  $("#setup-next-2").addEventListener("click", () => showSetupStep(3));
  $("#setup-back-2").addEventListener("click", () => showSetupStep(2));
  $("#setup-form [name=language]").addEventListener("change", event => { state.language = event.target.value; applyTranslations(); });
  $("#setup-form [name=enable_ipv6]").addEventListener("change", event => { $("#setup-ipv6-fields").hidden = !event.target.checked; });
  $("#login-form").addEventListener("submit", login);
  $("#enter-app").addEventListener("click", showApp);
  $("#copy-first-token").addEventListener("click", () => copyText($("#first-token").textContent));
  $("#copy-first-command").addEventListener("click", () => copyText($("#first-report-command").textContent));
  $("#menu-toggle").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  $("#mobile-refresh").addEventListener("click", renderRoute);
  window.addEventListener("hashchange", routeFromHash);
}

function showSetupStep(step) {
  if (step > 1) {
    const fields = $$(`[data-setup-step="${step - 1}"] input, [data-setup-step="${step - 1}"] select`);
    if (!fields.every(field => field.reportValidity())) return;
  }
  $$('[data-setup-step]').forEach(node => node.hidden = Number(node.dataset.setupStep) !== step);
  $("#step-dot-1").classList.toggle("active", step === 1);
  $("#step-dot-2").classList.toggle("active", step === 2);
  $("#step-dot-3").classList.toggle("active", step === 3);
  if (step === 2) $('[name=username]').focus();
  if (step === 3) $('[name=enable_ipv6]').focus();
}

function showOnly(id) {
  ["setup-screen","token-screen","login-screen","app-shell"].forEach(name => $(`#${name}`).hidden = name !== id);
}

async function setup(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.target));
  if (data.password !== data.password_again) return toast(t("passwordMismatch"), true);
  data.enable_ipv6 = $("[name=enable_ipv6]", event.target).checked;
  if (!data.enable_ipv6) data.first_device_name = null;
  delete data.password_again;
  try {
    const result = await api("/api/setup", {method:"POST", body:JSON.stringify(data)});
    state.settings = result.settings; state.language = result.settings.language;
    const token = result.ipv6ReportToken || "";
    const command = token ? `STACKSTEAD_REPORT_URL='${location.origin}/api/ipv6/report' STACKSTEAD_DEVICE_TOKEN='${token}' sh /path/to/ipv6_report.sh` : "";
    $("#first-token").textContent = token; $("#first-report-command").textContent = command;
    $("#first-token-row").hidden = !token; $("#first-command-block").hidden = !token;
    $("#first-token-lead").dataset.i18n = token ? "tokenOnlyOnce" : (result.settings.ipv6Enabled ? "noFirstToken" : "ipv6Skipped");
    applyTranslations(); showOnly("token-screen");
  } catch (error) { toast(error.message, true); }
}

async function login(event) {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.target));
  try { await api("/api/login", {method:"POST", body:JSON.stringify(data)}); const me = await api("/api/me"); state.user=me;state.settings=me.settings;state.language=me.settings.language;showApp(); }
  catch (error) { toast(error.message, true); }
}

function showLogin() { clearInterval(state.timer); showOnly("login-screen"); applyTranslations(); }
function showApp() {
  showOnly("app-shell"); applyTranslations(); applyTrafficTheme();
  $("#brand-name").textContent = state.settings.appName || "Stackstead"; $("#mobile-brand").textContent = state.settings.appName || "Stackstead";
  renderNav(); routeFromHash(); clearInterval(state.timer); state.timer = setInterval(() => {
    if (state.route === "overview") loadOverview(false);
    if (state.route === "traffic" && !state.trafficHistoryOpen) loadTraffic(false);
  }, 5000);
}

function visibleNavItems() { return navItems.filter(([route]) => route !== "ipv6" || state.settings.ipv6Enabled); }

function renderNav() {
  $("#nav").innerHTML = visibleNavItems().map(([route,key,icon]) => `<button class="nav-item ${state.route===route?"active":""}" data-route="${route}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><span>${t(key)}</span></button>`).join("");
  $$(".nav-item").forEach(node => node.onclick = () => { location.hash = node.dataset.route; $(".sidebar").classList.remove("open"); });
}

function routeFromHash() {
  const requested = location.hash.slice(1);
  state.trafficHistoryOpen = requested === "traffic-history";
  const route = state.trafficHistoryOpen ? "traffic" : requested;
  state.route = visibleNavItems().some(item => item[0]===route) ? route : "overview";
  $$(".view").forEach(node => node.hidden = node.id !== `view-${state.route}`); renderNav(); renderRoute();
}

async function renderRoute() {
  try {
    if (state.route === "overview") await loadOverview();
    if (state.route === "traffic") await loadTraffic();
    if (state.route === "ipv6") await loadIPv6();
    if (state.route === "notifications") await loadNotifications();
    if (state.route === "settings") await loadSettings();
  } catch (error) { toast(error.message, true); }
}

function pageHead(title, lead, action = "") { return `<header class="page-head"><div><h1>${esc(title)}</h1><p>${esc(lead)}</p></div><div class="actions">${action}</div></header>`; }

async function loadOverview(showLoading = true) {
  const view = $("#view-overview"); if (showLoading && !state.dashboard) view.innerHTML = `<div class="empty">${t("loading")}</div>`;
  const [dashboard, history] = await Promise.all([api("/api/dashboard"), api("/api/traffic/history?hours=24")]);
  state.dashboard = dashboard; state.history = history.items; state.settings = dashboard.settings;
  applyTrafficTheme();
  const totals = dashboard.traffic.totals; const ipv6 = dashboard.ipv6;
  const ipv6Stats = ipv6 ? `${stat(t("ipv6Devices"),String(ipv6.device_count||0),`${ipv6.active_24h||0} ${t("active24h")}`,"accent-purple")}${stat(t("lastChange"),ipv6.lastChangeAt?formatRelative(ipv6.lastChangeAt):t("never"),ipv6.lastChangeAt?formatDate(ipv6.lastChangeAt):"","")}` : "";
  view.innerHTML = pageHead(t("welcome"),t(ipv6 ? "welcomeLead" : "welcomeLeadNoIpv6"),`<button class="secondary" id="refresh-overview">↻ ${t("refresh")}</button>`) + `
    <div class="grid stats">
      ${stat(t("downloadSpeed"),formatSpeed(totals.downloadSpeed),`${dashboard.traffic.downloaders.length} ${t("downloaders")}`,"accent-green")}
      ${stat(t("uploadSpeed"),formatSpeed(totals.uploadSpeed),formatTime(dashboard.traffic.lastPolledAt),"accent-blue")}
      ${ipv6Stats}
    </div>
    <div class="grid main-grid">
      <section class="card chart-card"><div class="card-head"><h2>${t("trafficTrend")}</h2><div class="legend"><span><i style="background:var(--traffic-download)"></i>${t("downloadSpeed")}</span><span><i style="background:var(--traffic-upload)"></i>${t("uploadSpeed")}</span></div></div>
        <div class="live-grid"><div class="speed-box download"><span>${t("todayDownload")}</span><strong>${formatTrafficBytes(totals.todayDownloadBytes)}</strong></div><div class="speed-box upload"><span>${t("todayUpload")}</span><strong>${formatTrafficBytes(totals.todayUploadBytes)}</strong></div></div>
        <div class="overview-traffic-chart">${renderTrafficGraph(appendLivePoint(state.history,totals),{rangeSeconds:86400})}</div>
      </section>
      <section class="card"><div class="card-head"><h2>${t("downloaders")}</h2><button class="ghost" data-go="settings">${t("settings")} →</button></div><div class="list">${renderLiveDownloaders(dashboard.traffic.downloaders)}</div></section>
    </div>`;
  $("#refresh-overview").onclick = () => loadOverview(false); $("[data-go=settings]").onclick = () => location.hash="settings";attachTrafficChart(view,appendLivePoint(state.history,totals));
}

function stat(label,value,trend,extra) { return `<section class="card stat ${extra}"><span class="label">${esc(label)}</span><strong>${esc(value)}</strong><div class="trend">${esc(trend||"")}</div></section>`; }

function renderLiveDownloaders(items) {
  if (!items.length) return `<div class="empty">${t("noDownloaders")}</div>`;
  return items.map(item => `<div class="list-item"><div class="avatar" style="background:${esc(item.color)}20;color:${esc(item.color)}">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="">`:esc(item.name.slice(0,2).toUpperCase())}</div><div class="item-main"><strong>${esc(item.name)}</strong><span>↓ ${formatSpeed(item.downloadSpeed)} · ↑ ${formatSpeed(item.uploadSpeed)}</span></div><div class="item-side"><span class="status ${item.status==='online'?'':'offline'}">${t(item.status==='online'?'online':'offline')}</span></div></div>`).join("");
}

async function loadTraffic(showLoading = true) {
  if (state.trafficHistoryOpen) return loadTrafficHistory();
  const view = $("#view-traffic");
  if (showLoading && !state.dashboard) view.innerHTML = `<div class="empty">${t("loading")}</div>`;
  const [dashboard, history] = await Promise.all([
    api("/api/dashboard"),
    api(`/api/traffic/history?range=${encodeURIComponent(state.trafficRange)}`),
  ]);
  state.dashboard = dashboard;
  state.history = history.items || [];
  state.settings = dashboard.settings;
  applyTrafficTheme();
  const traffic = dashboard.traffic;
  const totals = traffic.totals;
  const activeCandidate = [...traffic.downloaders].sort((a,b)=>(b.uploadSpeed+b.downloadSpeed)-(a.uploadSpeed+a.downloadSpeed))[0];
  const active = activeCandidate && activeCandidate.uploadSpeed + activeCandidate.downloadSpeed > 0 ? activeCandidate : null;
  const chartItems = appendLivePoint(state.history, totals);

  view.innerHTML = pageHead(t("trafficDashboard"),t("trafficDashboardLead"),`<span class="refresh-note">${esc(traffic.lastPolledAt ? formatRelative(traffic.lastPolledAt) : t("waiting"))}</span>`) + `
    <div class="traffic-summary-grid">
      ${renderTrafficSummaryCard(t("todayTraffic"), totals.todayDownloadBytes, totals.todayUploadBytes)}
      ${renderTrafficSummaryCard(t("historyTraffic"), totals.historyDownloadBytes, totals.historyUploadBytes, `<button class="card-link" id="open-traffic-history">${t("openHistory")} →</button>`)}
      <section class="card active-downloader-card">
        <span class="card-kicker">${t("mostActive")}</span>
        <div class="active-downloader-main">
          <div class="avatar large">${active?.imageUrl?`<img src="${esc(active.imageUrl)}" alt="">`:esc(active?.name?.slice(0,2)||"--")}</div>
          <div><strong>${esc(active?.name||"--")}</strong><span>${active?`↑ ${formatSpeed(active.uploadSpeed||0)} · ↓ ${formatSpeed(active.downloadSpeed||0)}`:t("noActiveDownloader")}</span></div>
        </div>
      </section>
    </div>

    <div class="traffic-live-layout">
      <section class="card gauge-card">
        <div class="card-head"><h2>${t("liveSpeed")}</h2><span class="refresh-note">${state.settings.pollSeconds || 5}s</span></div>
        <div class="speed-gauges">
          ${renderSpeedGauge("upload", totals.uploadSpeed, Number(state.settings.trafficUploadMaxMbps)||12.5, state.settings.trafficUploadColor, traffic.todayPeak.uploadSpeed, traffic.todayPeak.uploadAt)}
          ${renderSpeedGauge("download", totals.downloadSpeed, Number(state.settings.trafficDownloadMaxMbps)||125, state.settings.trafficDownloadColor, traffic.todayPeak.downloadSpeed, traffic.todayPeak.downloadAt)}
        </div>
      </section>
      <section class="card share-card">
        <div class="card-head"><h2>${t("liveShare")}</h2></div>
        ${renderDonut(traffic.downloaders, state.speedShareMode === "upload" ? "uploadSpeed" : "downloadSpeed", state.speedShareMode === "upload" ? t("liveUploadShare") : t("liveDownloadShare"), "speed-share-toggle", true)}
      </section>
    </div>

    <section class="card traffic-chart-card">
      <div class="card-head"><div><h2>${t("trafficChart")}</h2><p class="muted">${t("downloadSpeed")} / ${t("uploadSpeed")}</p></div>${renderRangeButtons()}</div>
      ${renderTrafficGraph(chartItems, {rangeSeconds: trafficRangeSeconds(state.trafficRange)})}
    </section>

    <div class="traffic-bottom-layout">
      <section class="card share-card today-share-card">
        <div class="card-head"><h2>${t("todayShare")}</h2></div>
        ${renderDonut(traffic.downloaders, state.trafficShareMode === "upload" ? "todayUploadBytes" : "todayDownloadBytes", state.trafficShareMode === "upload" ? t("todayUploadShare") : t("todayDownloadShare"), "traffic-share-toggle", false)}
      </section>
      <section class="card ranking-card">
        <div class="card-head"><div><h2>${t("todayRanking")}</h2><p class="muted">${state.rankingMode === "upload" ? t("uploadSort") : t("downloadSort")}</p></div><button class="secondary compact-button" id="ranking-toggle">${state.rankingMode === "upload" ? t("uploadSort") : t("downloadSort")}</button></div>
        ${renderTrafficRanking(traffic.downloaders)}
      </section>
    </div>`;

  $("#open-traffic-history").onclick = () => { location.hash = "traffic-history"; };
  $$('[data-traffic-range]').forEach(button => button.onclick = () => { state.trafficRange=button.dataset.trafficRange;loadTraffic(false); });
  $("[data-speed-share-toggle]").onclick = () => { state.speedShareMode=state.speedShareMode==="upload"?"download":"upload";loadTraffic(false); };
  $("[data-traffic-share-toggle]").onclick = () => { state.trafficShareMode=state.trafficShareMode==="upload"?"download":"upload";loadTraffic(false); };
  $("#ranking-toggle").onclick = () => { state.rankingMode=state.rankingMode==="upload"?"download":"upload";loadTraffic(false); };
  attachTrafficChart(view, chartItems);
}

function renderTrafficSummaryCard(label, downloadBytes, uploadBytes, action="") {
  return `<section class="card traffic-summary-card"><div class="summary-title"><span class="card-kicker">${esc(label)}</span>${action}</div><div class="summary-values"><div class="download"><small>↓ ${t("downloadTraffic")}</small><strong>${formatTrafficBytes(downloadBytes)}</strong></div><i></i><div class="upload"><small>↑ ${t("uploadTraffic")}</small><strong>${formatTrafficBytes(uploadBytes)}</strong></div></div></section>`;
}

function renderSpeedGauge(type, value, maxMb, color, peak, peakAt) {
  const ratio = Math.max(0, Math.min(1, (Number(value)||0)/(maxMb*MB)));
  const level = ratio <= 0 ? 0 : Math.min(4, Math.ceil(ratio*4));
  const alpha = [0,.25,.5,.75,1][level];
  const readingColor = ratio > 0 ? hexRgba(color,alpha) : "var(--muted)";
  const center={x:120,y:124}, tip=polarPoint(center.x,center.y,72,-180+ratio*180);
  const arcs=[0,1,2,3].map(index=>`<path d="${describeArc(center.x,center.y,88,-180+index*45,-180+index*45+40)}" stroke="${esc(color)}" stroke-opacity="${[.25,.5,.75,1][index]}"/>`).join("");
  return `<article class="speed-gauge is-${type}"><svg viewBox="0 0 240 145" aria-hidden="true"><g class="gauge-arcs">${arcs}</g><line class="gauge-needle" x1="${center.x}" y1="${center.y}" x2="${tip.x.toFixed(2)}" y2="${tip.y.toFixed(2)}"/><circle class="gauge-pin" cx="${center.x}" cy="${center.y}" r="8"/></svg><div class="gauge-reading" style="color:${readingColor}"><strong>${((Number(value)||0)/MB).toFixed(2)}</strong><span>MB/s</span></div><div class="gauge-name">${t(type==="upload"?"uploadSpeed":"downloadSpeed")} · 0–${formatCompactNumber(maxMb)} MB/s</div><small>${t("todayPeak")} ${peak?formatSpeed(peak):"--"}${peakAt?` · ${formatTime(peakAt)}`:""}</small></article>`;
}

function renderDonut(items, field, title, toggleAttribute, speed) {
  const sorted=[...items].filter(item=>(Number(item[field])||0)>0).sort((a,b)=>(b[field]||0)-(a[field]||0));
  const total=sorted.reduce((sum,item)=>sum+(Number(item[field])||0),0);
  let offset=0;
  const segments=sorted.map(item=>{const percent=total?(Number(item[field])||0)/total*100:0;const visible=Math.max(0,percent-.8);const circle=`<circle class="donut-segment" cx="50" cy="50" r="40" pathLength="100" stroke="${esc(item.color||"#6c7fa5")}" stroke-dasharray="${visible.toFixed(3)} ${(100-visible).toFixed(3)}" stroke-dashoffset="${(-offset).toFixed(3)}"><title>${esc(item.name)} · ${speed?formatSpeed(item[field]):formatTrafficBytes(item[field])}</title></circle>`;offset+=percent;return circle;}).join("");
  return `<div class="donut-layout"><button class="donut" type="button" data-${toggleAttribute} aria-label="${esc(title)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="donut-track" cx="50" cy="50" r="40"/>${segments}</svg><span class="donut-center"><strong>${speed?formatSpeedShort(total):formatTrafficBytes(total)}</strong><span>${esc(title)}</span></span></button><div class="donut-list">${sorted.map(item=>`<div><i style="background:${esc(item.color||"#6c7fa5")}"></i><span>${esc(item.name)}</span><strong>${speed?formatSpeed(item[field]):formatTrafficBytes(item[field])}</strong></div>`).join("")||`<p class="muted">${t("noTrafficData")}</p>`}</div></div>`;
}

function renderTrafficRanking(items) {
  const sortField=state.rankingMode==="upload"?"todayUploadBytes":"todayDownloadBytes";
  const sorted=[...items].sort((a,b)=>(b[sortField]||0)-(a[sortField]||0));
  const uploadMax=Math.max(1,...sorted.map(item=>Number(item.todayUploadBytes)||0));
  const downloadMax=Math.max(1,...sorted.map(item=>Number(item.todayDownloadBytes)||0));
  return `<div class="traffic-ranking">${sorted.map(item=>`<article class="ranking-row"><div class="ranking-name"><span class="avatar tiny">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="">`:esc(item.name.slice(0,2))}</span><strong>${esc(item.name)}</strong></div><div class="ranking-bars"><div><span>↑</span><i><b class="upload-bar" style="width:${((item.todayUploadBytes||0)/uploadMax*100).toFixed(2)}%"></b></i><em>${formatTrafficBytes(item.todayUploadBytes||0)}</em></div><div><span>↓</span><i><b class="download-bar" style="width:${((item.todayDownloadBytes||0)/downloadMax*100).toFixed(2)}%"></b></i><em>${formatTrafficBytes(item.todayDownloadBytes||0)}</em></div></div></article>`).join("")||`<div class="empty compact">${t("noDownloaders")}</div>`}</div>`;
}

function renderRangeButtons() {
  return `<div class="range-switch">${["30m","1h","6h","24h"].map(key=>`<button class="${state.trafficRange===key?"active":""}" data-traffic-range="${key}">${t(`range${key}`)}</button>`).join("")}</div>`;
}

function appendLivePoint(items, totals) {
  const result=[...(items||[])];
  const last=result.at(-1);const now=new Date().toISOString();
  if (!last || Date.now()-Date.parse(last.sampled_at)>5000) result.push({sampled_at:now,download_speed:totals.downloadSpeed||0,upload_speed:totals.uploadSpeed||0});
  return result;
}

function trafficRangeSeconds(key){return {"30m":1800,"1h":3600,"6h":21600,"24h":86400}[key]||1800;}

function renderTrafficGraph(items, options={}) {
  if (!items?.length) return `<div class="chart-empty">${t("waiting")}</div>`;
  const width=900,height=330,pad={left:54,right:14,top:18,bottom:28};
  const values=items.map(item=>({time:Date.parse(item.sampled_at),download:Number(item.download_speed)||0,upload:Number(item.upload_speed)||0})).filter(item=>Number.isFinite(item.time));
  if (!values.length) return `<div class="chart-empty">${t("waiting")}</div>`;
  const end=options.endTime||Date.now();const start=options.startTime||(end-(options.rangeSeconds||1800));
  const maxValue=niceTrafficMax(Math.max(...values.flatMap(item=>[item.download,item.upload]),1));
  const plotWidth=width-pad.left-pad.right,plotHeight=height-pad.top-pad.bottom;
  const pointFor=(item,key)=>({x:pad.left+Math.max(0,Math.min(1,(item.time-start)/Math.max(1,end-start)))*plotWidth,y:pad.top+(1-Math.max(0,Math.min(1,item[key]/maxValue)))*plotHeight});
  const down=values.map(item=>pointFor(item,"download"));const up=values.map(item=>pointFor(item,"upload"));
  const downLine=smoothPath(down),upLine=smoothPath(up);const baseline=pad.top+plotHeight;
  const downArea=`${downLine} L ${down.at(-1).x.toFixed(2)} ${baseline} L ${down[0].x.toFixed(2)} ${baseline} Z`;
  const upArea=`${upLine} L ${up.at(-1).x.toFixed(2)} ${baseline} L ${up[0].x.toFixed(2)} ${baseline} Z`;
  const yGrid=[0,1,2,3,4].map(index=>{const y=pad.top+plotHeight*(index/4);const value=maxValue*(1-index/4);return `<line x1="${pad.left}" y1="${y}" x2="${width-pad.right}" y2="${y}"/><text x="${pad.left-8}" y="${y+4}" text-anchor="end">${formatAxisSpeed(value)}</text>`;}).join("");
  const xLabels=[0,1,2,3,4,5,6].map(index=>{const ratio=index/6,x=pad.left+ratio*plotWidth,date=new Date(start+(end-start)*ratio);return `<text x="${x}" y="${height-5}" text-anchor="${index===0?"start":index===6?"end":"middle"}">${formatShortTime(date)}</text>`;}).join("");
  return `<div class="traffic-graph" data-traffic-chart data-chart-start="${start}" data-chart-end="${end}" data-chart-left="${pad.left/width}" data-chart-right="${pad.right/width}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="trafficDownloadArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(state.settings.trafficDownloadColor||"#0E8E3F")}" stop-opacity=".25"/><stop offset="1" stop-color="${esc(state.settings.trafficDownloadColor||"#0E8E3F")}" stop-opacity=".02"/></linearGradient><linearGradient id="trafficUploadArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${esc(state.settings.trafficUploadColor||"#205DA6")}" stop-opacity=".25"/><stop offset="1" stop-color="${esc(state.settings.trafficUploadColor||"#205DA6")}" stop-opacity=".02"/></linearGradient></defs><g class="traffic-grid">${yGrid}${xLabels}</g><path class="traffic-area download-area" d="${downArea}"/><path class="traffic-area upload-area" d="${upArea}"/><path class="traffic-line download-line" d="${downLine}"/><path class="traffic-line upload-line" d="${upLine}"/></svg><div class="chart-crosshair"></div><div class="chart-tooltip-html"><strong></strong><span class="tooltip-download"></span><span class="tooltip-upload"></span></div></div>`;
}

function smoothPath(points) {
  if (!points.length) return "";if(points.length===1)return `M ${points[0].x} ${points[0].y}`;
  let path=`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for(let index=0;index<points.length-1;index++){const current=points[index],next=points[index+1],midX=(current.x+next.x)/2,midY=(current.y+next.y)/2;path+=` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${midY.toFixed(2)}`;}
  const last=points.at(-1);return `${path} L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
}

function niceTrafficMax(bytes) {
  const mb=bytes/MB;const candidates=[5,10,12.5,25,50,75,100,125];const next=candidates.find(value=>value>mb);
  if(next)return next*MB;const step=mb<500?25:mb<1000?50:100;return (Math.floor(mb/step)+1)*step*MB;
}

function attachTrafficChart(root, items) {
  const chart=$("[data-traffic-chart]",root);if(!chart||!items?.length)return;
  const tooltip=$(".chart-tooltip-html",chart),crosshair=$(".chart-crosshair",chart);const start=Number(chart.dataset.chartStart),end=Number(chart.dataset.chartEnd),left=Number(chart.dataset.chartLeft),right=Number(chart.dataset.chartRight);
  const values=items.map(item=>({...item,time:Date.parse(item.sampled_at)})).filter(item=>Number.isFinite(item.time));
  const move=event=>{const rect=chart.getBoundingClientRect(),raw=(event.clientX-rect.left)/rect.width,ratio=Math.max(0,Math.min(1,(raw-left)/(1-left-right))),target=start+(end-start)*ratio;let nearest=values[0];for(const item of values)if(Math.abs(item.time-target)<Math.abs(nearest.time-target))nearest=item;const x=left+(nearest.time-start)/Math.max(1,end-start)*(1-left-right);crosshair.style.left=`${x*100}%`;tooltip.style.left=`${Math.max(8,Math.min(78,x*100))}%`;tooltip.querySelector("strong").textContent=formatShortTime(new Date(nearest.time));tooltip.querySelector(".tooltip-download").textContent=`↓ ${t("downloadSpeed")} ${formatSpeed(nearest.download_speed)}`;tooltip.querySelector(".tooltip-upload").textContent=`↑ ${t("uploadSpeed")} ${formatSpeed(nearest.upload_speed)}`;chart.classList.add("hovering");};
  chart.addEventListener("pointermove",move);chart.addEventListener("pointerdown",move);chart.addEventListener("pointerleave",()=>chart.classList.remove("hovering"));
}

async function loadTrafficHistory() {
  const view=$("#view-traffic");view.innerHTML=`<div class="empty">${t("loading")}</div>`;
  const history=await api("/api/traffic/daily?limit=90");
  if(!history.items.length){view.innerHTML=pageHead(t("historyDetail"),t("historyDetailLead"),`<button class="secondary" id="traffic-history-back">← ${t("back")}</button>`)+`<section class="card empty">${t("noTrafficData")}</section>`;$("#traffic-history-back").onclick=()=>location.hash="traffic";return;}
  if(!state.trafficHistoryDate||!history.items.some(item=>item.dateKey===state.trafficHistoryDate))state.trafficHistoryDate=history.items[0].dateKey;
  const query=state.trafficHistoryDownloader?`?downloader_id=${state.trafficHistoryDownloader}`:"";
  const detail=await api(`/api/traffic/daily/${state.trafficHistoryDate}${query}`);
  const dayStart=Date.parse(detail.startAt),dayEnd=Date.parse(detail.endAt);
  view.innerHTML=pageHead(t("historyDetail"),t("historyDetailLead"),`<button class="secondary" id="traffic-history-back">← ${t("back")}</button>`)+`<div class="history-layout"><aside class="card history-days">${history.items.map(item=>`<button class="${item.dateKey===state.trafficHistoryDate?"active":""}" data-history-date="${item.dateKey}"><strong>${esc(item.dateKey)}</strong><span>↑ ${formatTrafficBytes(item.uploadBytes)} · ↓ ${formatTrafficBytes(item.downloadBytes)}</span></button>`).join("")}</aside><section class="history-detail-stack"><section class="card"><div class="card-head"><div><h2>${esc(detail.dateKey)}</h2><p class="muted">${t("dailyDetail")}</p></div><select id="history-downloader"><option value="">${t("allDownloaders")}</option>${detail.downloaders.map(item=>`<option value="${item.id}" ${Number(state.trafficHistoryDownloader)===item.id?"selected":""}>${esc(item.name)}</option>`).join("")}</select></div><div class="history-totals"><div class="upload"><span>↑ ${t("uploadTraffic")}</span><strong>${formatTrafficBytes(detail.uploadBytes)}</strong></div><div class="download"><span>↓ ${t("downloadTraffic")}</span><strong>${formatTrafficBytes(detail.downloadBytes)}</strong></div></div>${renderTrafficGraph(detail.items,{startTime:dayStart,endTime:dayEnd})}</section><section class="card"><div class="card-head"><h2>${t("downloaders")}</h2></div>${renderTrafficRanking(detail.downloaders.map(item=>({...item,todayUploadBytes:item.uploadBytes,todayDownloadBytes:item.downloadBytes})))}</section></section></div>`;
  $("#traffic-history-back").onclick=()=>location.hash="traffic";
  $$('[data-history-date]').forEach(button=>button.onclick=()=>{state.trafficHistoryDate=button.dataset.historyDate;state.trafficHistoryDownloader=null;loadTrafficHistory();});
  $("#history-downloader").onchange=event=>{state.trafficHistoryDownloader=event.target.value?Number(event.target.value):null;loadTrafficHistory();};
  attachTrafficChart(view,detail.items);
}

function polarPoint(cx,cy,r,angle){const radians=angle*Math.PI/180;return{x:cx+r*Math.cos(radians),y:cy+r*Math.sin(radians)};}
function describeArc(cx,cy,r,startAngle,endAngle){const start=polarPoint(cx,cy,r,startAngle),end=polarPoint(cx,cy,r,endAngle);return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;}
function hexRgba(hex,alpha){const clean=String(hex||"#000000").replace("#","");const value=parseInt(clean,16);return `rgba(${(value>>16)&255},${(value>>8)&255},${value&255},${alpha})`;}
function formatCompactNumber(value){return Number.isInteger(value)?String(value):Number(value).toFixed(1).replace(/\.0$/,"");}
function formatSpeedShort(value){const mb=(Number(value)||0)/MB;return `${mb>=10?mb.toFixed(1):mb.toFixed(2)} MB/s`;}
function formatAxisSpeed(value){const mb=value/MB;return mb>=10?`${mb.toFixed(0)}`:`${mb.toFixed(1)}`;}
function formatShortTime(value){return new Intl.DateTimeFormat(state.language,{hour:"2-digit",minute:"2-digit"}).format(value);}

function editDownloader(id=null) {
  const item=state.downloaders.find(x=>x.id===id); const form=$("#editor-form");
  form.innerHTML=`<h2>${item?t("edit"):t("addDownloader")}</h2><div class="dialog-fields">
    <label><span>${t("name")}</span><input name="name" value="${esc(item?.name||"")}" required></label>
    <label><span>${t("type")}</span><select name="kind"><option value="qbittorrent" ${item?.kind==='qbittorrent'?'selected':''}>qBittorrent</option><option value="transmission" ${item?.kind==='transmission'?'selected':''}>Transmission</option></select></label>
    <label class="wide"><span>${t("baseUrl")}</span><input name="base_url" type="url" value="${esc(item?.baseUrl||"http://")}" required></label>
    <label><span>${t("username")}</span><input name="username" value="${esc(item?.username||"")}" autocomplete="off"></label>
    <label><span>${item?t("passwordKeep"):t("password")}</span><input name="password" type="password" autocomplete="new-password"></label>
    <label><span>${t("rpcPath")}</span><input name="rpc_path" value="${esc(item?.rpcPath||"/transmission/rpc")}"></label>
    <label><span>${t("color")}</span><input name="color" type="color" value="${esc(item?.color||"#2563eb")}"></label>
    <label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="enabled" type="checkbox" ${item?.enabled!==false?'checked':''}><span>${t("enabled")}</span></label>
    <label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="verify_tls" type="checkbox" ${item?.verifyTls!==false?'checked':''}><span>${t("verifyTls")}</span></label></div>
    <div class="dialog-actions"><button type="button" class="secondary" data-close>${t("cancel")}</button><button type="submit" class="primary">${t("save")}</button></div>`;
  form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));values.enabled=$('[name=enabled]',form).checked;values.verify_tls=$('[name=verify_tls]',form).checked;if(item&& !values.password) values.password=null;try{await api(`/api/downloaders${item?`/${item.id}`:''}`,{method:item?'PUT':'POST',body:JSON.stringify(values)});$("#editor-dialog").close();toast(t("saved"));loadSettings();}catch(error){toast(error.message,true);}};
  $('[data-close]',form).onclick=()=>$("#editor-dialog").close(); $("#editor-dialog").showModal();
}

function chooseImage(id) { const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp,image/gif";input.onchange=async()=>{if(!input.files[0])return;const body=new FormData();body.append("image",input.files[0]);try{await api(`/api/downloaders/${id}/image`,{method:"POST",body});toast(t("saved"));loadSettings();}catch(error){toast(error.message,true);}};input.click(); }
async function removeDownloader(id) { if(!await confirmAction(t("confirmDelete"),t("deleteDownloaderText")))return;try{await api(`/api/downloaders/${id}`,{method:"DELETE"});toast(t("deleted"));loadSettings();}catch(error){toast(error.message,true);} }
async function testDownloader(id) { try { const result=await api(`/api/downloaders/${id}/test`,{method:"POST"});toast(`${t("connectionOk")}: ↓ ${formatSpeed(result.downloadSpeed)} · ↑ ${formatSpeed(result.uploadSpeed)}`); } catch(error) { toast(error.message,true); } }

async function loadIPv6() {
  const result=await api("/api/ipv6/devices");state.devices=result.items;const view=$("#view-ipv6");const origin=location.origin;
  view.innerHTML=pageHead(t("ipv6Devices"),t("reportGuideLead"),`<button class="primary" id="add-ipv6-device">＋ ${t("addDevice")}</button>`)+`<div class="grid split"><section class="card table-wrap"><div class="card-head"><h2>${t("currentAddress")}</h2></div><table class="table"><thead><tr><th>${t("name")}</th><th>${t("currentAddress")}</th><th>${t("prefix")}</th><th>${t("lastReport")}</th><th>${t("actions")}</th></tr></thead><tbody>${state.devices.map(d=>`<tr><td data-device-history="${d.id}" style="cursor:pointer"><strong>${esc(d.name)}</strong><br><span class="status ${d.stale?'offline':''}">${d.stale?t("stale"):(d.enabled?t("enabled"):t("offline"))}</span></td><td class="mono">${esc(d.currentIpv6||"-")}</td><td class="mono">${esc(d.currentPrefix64||"-")}</td><td>${formatRelative(d.lastReportedAt)}</td><td><button class="ghost" data-device-history="${d.id}">${t("history")}</button><button class="ghost" data-edit-device="${d.id}">${t("edit")}</button><button class="ghost" data-rotate-device="${d.id}">${t("rotateToken")}</button><button class="ghost" data-delete-device="${d.id}">${t("remove")}</button></td></tr>`).join("")||`<tr><td colspan="5"><div class="empty">${t("noDevices")}</div></td></tr>`}</tbody></table></section><aside class="stack"><section class="card"><div class="card-head"><h2>${t("reportGuide")}</h2><a class="secondary" href="/api/ipv6/reporter">↓ Reporter</a></div><p class="muted">${t("reportGuideLead")}</p><div class="callout mono">STACKSTEAD_REPORT_URL=${esc(origin)}/api/ipv6/report \<br>STACKSTEAD_DEVICE_TOKEN=&lt;DEVICE_TOKEN&gt; \<br>/path/to/ipv6_report.sh</div></section></aside></div>`;
  $("#add-ipv6-device").onclick=()=>editIPv6Device();
  $$('[data-device-history]').forEach(n=>n.onclick=()=>showIPv6History(Number(n.dataset.deviceHistory)));
  $$('[data-edit-device]').forEach(n=>n.onclick=()=>editIPv6Device(Number(n.dataset.editDevice)));
  $$('[data-rotate-device]').forEach(n=>n.onclick=()=>rotateDeviceToken(Number(n.dataset.rotateDevice)));
  $$('[data-delete-device]').forEach(n=>n.onclick=()=>removeIPv6Device(Number(n.dataset.deleteDevice)));
}

function editIPv6Device(id=null) {
  const item=state.devices.find(device=>device.id===id);const form=$("#editor-form");
  form.innerHTML=`<h2>${item?t("edit"):t("addDevice")}</h2><div class="dialog-fields"><label class="wide"><span>${t("name")}</span><input name="name" value="${esc(item?.name||"")}" required></label><label><span>${t("staleAfter")}</span><input name="stale_after_minutes" type="number" min="60" max="10080" value="${item?.staleAfterMinutes||150}" required></label><label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="enabled" type="checkbox" ${item?.enabled!==false?'checked':''}><span>${t("enabled")}</span></label></div><div class="dialog-actions"><button type="button" class="secondary" data-close>${t("cancel")}</button><button type="submit" class="primary">${t("save")}</button></div>`;
  form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));values.stale_after_minutes=Number(values.stale_after_minutes);values.enabled=$('[name=enabled]',form).checked;try{const result=await api(`/api/ipv6/devices${item?`/${item.id}`:''}`,{method:item?'PUT':'POST',body:JSON.stringify(values)});if(result.token){showDeviceToken(result.token);}else{$("#editor-dialog").close();toast(t("saved"));loadIPv6();}}catch(error){toast(error.message,true);}};
  $('[data-close]',form).onclick=()=>$("#editor-dialog").close();$("#editor-dialog").showModal();
}

function showDeviceToken(token) {
  const command=`STACKSTEAD_REPORT_URL='${location.origin}/api/ipv6/report' STACKSTEAD_DEVICE_TOKEN='${token}' sh /path/to/ipv6_report.sh`;const form=$("#editor-form");form.innerHTML=`<h2>${t("tokenOnlyOnce")}</h2><div class="secret-row"><code>${esc(token)}</code><button class="secondary" type="button" data-copy-token>${t("copyToken")}</button></div><p class="muted">${t("reportCommandLead")}</p><div class="secret-row command-row"><code>${esc(command)}</code><button class="secondary" type="button" data-copy-command>${t("copyCommand")}</button></div><a class="secondary full download-link" href="/api/ipv6/reporter">${t("downloadReporter")}</a><div class="dialog-actions"><button class="primary" type="button" data-close>${t("confirm")}</button></div>`;$('[data-copy-token]',form).onclick=()=>copyText(token);$('[data-copy-command]',form).onclick=()=>copyText(command);$('[data-close]',form).onclick=()=>{$("#editor-dialog").close();loadIPv6();};
}

async function rotateDeviceToken(id){if(!await confirmAction(t("rotateToken"),t("rotateWarning")))return;try{const result=await api(`/api/ipv6/devices/${id}/token/rotate`,{method:"POST"});$("#editor-dialog").showModal();showDeviceToken(result.token);}catch(error){toast(error.message,true);}}
async function removeIPv6Device(id){if(!await confirmAction(t("confirmDelete"),t("deleteDeviceText")))return;try{await api(`/api/ipv6/devices/${id}`,{method:"DELETE"});toast(t("deleted"));loadIPv6();}catch(error){toast(error.message,true);}}

async function showIPv6History(id) {
  const device=state.devices.find(d=>d.id===id);const result=await api(`/api/ipv6/devices/${id}/history`);const view=$("#view-ipv6");
  view.innerHTML=pageHead(`${t("deviceHistory")} · ${device?.name||""}`,t("history"),`<button class="secondary" id="ipv6-back">← ${t("back")}</button>`)+`<section class="card table-wrap"><table class="table"><thead><tr><th>${t("lastReport")}</th><th>${t("currentAddress")}</th><th>${t("prefix")}</th><th>${t("status")}</th></tr></thead><tbody>${result.items.map(h=>`<tr><td>${formatDate(h.recorded_at)}</td><td class="mono">${esc(h.ipv6)}</td><td class="mono">${esc(h.prefix64)}</td><td><span class="status ${h.changed?'offline':''}">${t(h.changed?'changed':'unchanged')}</span></td></tr>`).join("")}</tbody></table></section>`;$("#ipv6-back").onclick=loadIPv6;
}

async function loadNotifications() {
  const result=await api("/api/notifications");state.notifications=result.items.map(target=>({...target,events:Object.fromEntries(Object.entries(target.events).filter(([key])=>state.settings.ipv6Enabled||!key.startsWith("ipv6_")))}));const view=$("#view-notifications");
  view.innerHTML=pageHead(t("barkTargets"),t("barkLead"),`<button class="primary" id="add-target">＋ ${t("addTarget")}</button>`)+`<div class="grid split"><div class="stack">${state.notifications.map(target=>`<section class="card"><div class="card-head"><div><h2>${esc(target.name)}</h2><p class="muted mono">${esc(target.serverUrl)}</p></div><span class="status ${target.enabled?'':'offline'}">${target.enabled?t("enabled"):t("offline")}</span></div><div class="event-grid">${Object.entries(target.events).map(([key,on])=>`<span class="event-chip ${on?'on':''}">● ${t(`event_${key}`)}</span>`).join("")}</div><div class="dialog-actions"><button class="secondary" data-test-target="${target.id}">${t("test")}</button><button class="ghost" data-edit-target="${target.id}">${t("edit")}</button><button class="ghost" data-delete-target="${target.id}">${t("remove")}</button></div></section>`).join("")||`<section class="card empty">${t("noTargets")}</section>`}</div><aside class="card"><h2>Bark Server</h2><p class="muted">Stackstead does not bundle bark-server. Each target stores its own server URL and encrypted device key.</p><div class="callout">POST <code>{server_url}/push</code><br>API V2 · JSON</div></aside></div>`;
  $("#add-target").onclick=()=>editTarget();$$('[data-edit-target]').forEach(n=>n.onclick=()=>editTarget(Number(n.dataset.editTarget)));$$('[data-delete-target]').forEach(n=>n.onclick=()=>removeTarget(Number(n.dataset.deleteTarget)));$$('[data-test-target]').forEach(n=>n.onclick=()=>testTarget(Number(n.dataset.testTarget)));
}

function editTarget(id=null) {
  const item=state.notifications.find(x=>x.id===id);const form=$("#editor-form");const eventKeys=["ipv6_changed","ipv6_missing","ipv6_recovered","ipv6_stale","downloader_offline","downloader_recovered","daily_traffic"].filter(key=>state.settings.ipv6Enabled||!key.startsWith("ipv6_"));
  form.innerHTML=`<h2>${item?t("edit"):t("addTarget")}</h2><div class="dialog-fields"><label><span>${t("name")}</span><input name="name" value="${esc(item?.name||"")}" required></label><label class="wide"><span>${t("serverUrl")}</span><input name="server_url" type="url" value="${esc(item?.serverUrl||"http://")}" required></label><label class="wide"><span>${item?t("passwordKeep"):t("deviceKey")}</span><input name="device_key" type="password" autocomplete="off"></label><label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="enabled" type="checkbox" ${item?.enabled!==false?'checked':''}><span>${t("enabled")}</span></label><label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="verify_tls" type="checkbox" ${item?.verifyTls!==false?'checked':''}><span>${t("verifyTls")}</span></label><div class="wide event-grid">${eventKeys.map(key=>`<label style="display:flex;align-items:center;flex-direction:row"><input class="toggle" name="event_${key}" type="checkbox" ${item?.events?.[key]||(!item&&key==='ipv6_changed')?'checked':''}><span>${t(`event_${key}`)}</span></label>`).join("")}</div></div><div class="dialog-actions"><button type="button" class="secondary" data-close>${t("cancel")}</button><button type="submit" class="primary">${t("save")}</button></div>`;
  form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));values.enabled=$('[name=enabled]',form).checked;values.verify_tls=$('[name=verify_tls]',form).checked;values.events=Object.fromEntries(eventKeys.map(key=>[key,$(`[name=event_${key}]`,form).checked]));if(item&&!values.device_key)values.device_key=null;try{await api(`/api/notifications${item?`/${item.id}`:''}`,{method:item?'PUT':'POST',body:JSON.stringify(values)});$("#editor-dialog").close();toast(t("saved"));loadNotifications();}catch(error){toast(error.message,true);}};
  $('[data-close]',form).onclick=()=>$("#editor-dialog").close();$("#editor-dialog").showModal();
}

async function testTarget(id){try{await api(`/api/notifications/${id}/test`,{method:"POST"});toast(t("testSent"));}catch(error){toast(error.message,true);}}
async function removeTarget(id){if(!await confirmAction(t("confirmDelete"),t("deleteTargetText")))return;try{await api(`/api/notifications/${id}`,{method:"DELETE"});toast(t("deleted"));loadNotifications();}catch(error){toast(error.message,true);}}

async function loadSettings() {
  const result=await api("/api/downloaders");state.downloaders=result.items;const s=state.settings;const view=$("#view-settings");
  view.innerHTML=pageHead(t("settings"),t("siteSettings"))+`<div class="settings-sections">
    <section class="card settings-section"><div class="card-head"><h2>${t("general")}</h2></div><form id="general-form" class="inline-form"><label><span>${t("appName")}</span><input name="app_name" value="${esc(s.appName||"")}" required></label><label><span>${t("language")}</span><select name="language"><option value="zh-CN" ${s.language==='zh-CN'?'selected':''}>简体中文</option><option value="en" ${s.language==='en'?'selected':''}>English</option></select></label><label><span>${t("timezone")}</span><input name="timezone" value="${esc(s.timezone||"Asia/Shanghai")}" required></label><button class="primary" type="submit">${t("save")}</button></form></section>
    <section class="card settings-section"><div class="card-head"><div><h2>${t("trafficSettings")}</h2><p class="muted">${t("trafficSettingsLead")}</p></div></div><form id="traffic-settings-form" class="traffic-settings-form"><label><span>${t("uploadColor")}</span><input name="upload_color" type="color" value="${esc(s.trafficUploadColor||"#205DA6")}"></label><label><span>${t("downloadColor")}</span><input name="download_color" type="color" value="${esc(s.trafficDownloadColor||"#0E8E3F")}"></label><label><span>${t("uploadMax")} (${t("mbPerSecond")})</span><input name="upload_max_mbps" type="number" min="0.1" max="100000" step="0.1" value="${esc(s.trafficUploadMaxMbps||12.5)}" required></label><label><span>${t("downloadMax")} (${t("mbPerSecond")})</span><input name="download_max_mbps" type="number" min="0.1" max="100000" step="0.1" value="${esc(s.trafficDownloadMaxMbps||125)}" required></label><button class="primary" type="submit">${t("save")}</button></form></section>
    <section class="card settings-section"><div class="card-head"><div><h2>${t("downloaderSettings")}</h2><p class="muted">${t("manageDownloadersLead")}</p></div><button class="primary" id="add-downloader">＋ ${t("addDownloader")}</button></div>${renderDownloaderTable()}</section>
    <section class="card settings-section"><div class="card-head"><div><h2>${t("featureSettings")}</h2><p class="muted">${t("featureSettingsLead")}</p></div></div><form id="features-form"><label class="feature-choice"><input class="toggle" name="ipv6_enabled" type="checkbox" ${s.ipv6Enabled?'checked':''}><span><strong>${t("enableIpv6")}</strong><small>${t("enableIpv6Lead")}</small></span></label><div class="dialog-actions"><button class="primary" type="submit">${t("save")}</button></div></form></section>
    <section class="card settings-section"><div class="card-head"><h2>${t("security")}</h2></div><div class="actions"><button class="danger" id="logout">${t("signOut")}</button></div></section></div>`;
  $("#general-form").onsubmit=saveGeneral;$("#traffic-settings-form").onsubmit=saveTrafficSettings;$("#features-form").onsubmit=saveFeatures;$("#logout").onclick=logout;$("#add-downloader").onclick=()=>editDownloader();
  $$('[data-test-downloader]').forEach(node=>node.onclick=()=>testDownloader(Number(node.dataset.testDownloader)));$$('[data-edit]').forEach(node=>node.onclick=()=>editDownloader(Number(node.dataset.edit)));$$('[data-delete]').forEach(node=>node.onclick=()=>removeDownloader(Number(node.dataset.delete)));$$('[data-image]').forEach(node=>node.onclick=()=>chooseImage(Number(node.dataset.image)));
}

function renderDownloaderTable(){return `<div class="table-wrap"><table class="table"><thead><tr><th>${t("name")}</th><th>${t("type")}</th><th>${t("address")}</th><th>${t("status")}</th><th>${t("actions")}</th></tr></thead><tbody>${state.downloaders.map(d=>`<tr><td><div class="downloader-name-cell"><div class="avatar">${d.imageUrl?`<img src="${esc(d.imageUrl)}" alt="">`:esc(d.name.slice(0,2))}</div><strong>${esc(d.name)}</strong></div></td><td>${d.kind==='qbittorrent'?'qBittorrent':'Transmission'}</td><td class="mono">${esc(d.baseUrl)}</td><td><span class="status ${d.enabled?'':'offline'}">${d.enabled?t("enabled"):t("offline")}</span></td><td><button class="ghost" data-test-downloader="${d.id}">${t("test")}</button><button class="ghost" data-edit="${d.id}">${t("edit")}</button><button class="ghost" data-image="${d.id}">${t("image")}</button><button class="ghost" data-delete="${d.id}">${t("remove")}</button></td></tr>`).join("")||`<tr><td colspan="5"><div class="empty compact">${t("noDownloaders")}</div></td></tr>`}</tbody></table></div>`;}

async function saveGeneral(event){event.preventDefault();const values=Object.fromEntries(new FormData(event.target));try{const result=await api("/api/settings/general",{method:"PUT",body:JSON.stringify(values)});state.settings=result;state.language=result.language;applyTranslations();toast(t("saved"));showApp();}catch(error){toast(error.message,true);}}
async function saveTrafficSettings(event){event.preventDefault();const values=Object.fromEntries(new FormData(event.target));values.upload_max_mbps=Number(values.upload_max_mbps);values.download_max_mbps=Number(values.download_max_mbps);try{const result=await api("/api/settings/traffic",{method:"PUT",body:JSON.stringify(values)});state.settings=result;applyTrafficTheme();toast(t("saved"));loadSettings();}catch(error){toast(error.message,true);}}
async function saveFeatures(event){event.preventDefault();const values={ipv6_enabled:$("[name=ipv6_enabled]",event.target).checked};try{const result=await api("/api/settings/features",{method:"PUT",body:JSON.stringify(values)});state.settings=result;if(!result.ipv6Enabled&&state.route==="ipv6")location.hash="overview";toast(t("saved"));showApp();}catch(error){toast(error.message,true);}}
async function logout(){try{await api("/api/logout",{method:"POST"});}finally{state.user=null;showLogin();}}

function confirmAction(title,message){return new Promise(resolve=>{const dialog=$("#confirm-dialog");$("#confirm-title").textContent=title;$("#confirm-message").textContent=message;dialog.showModal();dialog.addEventListener("close",()=>resolve(dialog.returnValue==="confirm"),{once:true});});}
async function copyText(value){
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(value);
    else {
      const field=document.createElement("textarea");field.value=value;field.readOnly=true;field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.focus();field.select();field.setSelectionRange(0,field.value.length);
      const copied=document.execCommand("copy");field.remove();if(!copied)throw new Error("Copy failed");
    }
    toast(t("copied"));
  } catch { toast(t("copyFailed"),true); }
}
function formatBytes(value){let n=Number(value)||0;const units=["B","KB","MB","GB","TB","PB"];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}return `${n.toFixed(i<2?0:2)} ${units[i]}`;}
function formatTrafficBytes(value){let n=(Number(value)||0)/MB;const units=["MB","GB","TB","PB"];let i=0;while(n>=1024&&i<units.length-1){n/=1024;i++;}const digits=n>=100?0:n>=10?1:2;return `${n.toFixed(digits)} ${units[i]}`;}
function formatSpeed(value){return `${formatBytes(value)}/s`;}
function formatDate(value){if(!value)return t("never");return new Intl.DateTimeFormat(state.language,{dateStyle:"medium",timeStyle:"medium"}).format(new Date(value));}
function formatTime(value){if(!value)return t("waiting");return new Intl.DateTimeFormat(state.language,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value));}
function formatRelative(value){if(!value)return t("never");const seconds=Math.round((new Date(value)-Date.now())/1000);const abs=Math.abs(seconds);const unit=abs<60?"second":abs<3600?"minute":abs<86400?"hour":"day";const divisor={second:1,minute:60,hour:3600,day:86400}[unit];return new Intl.RelativeTimeFormat(state.language,{numeric:"auto"}).format(Math.round(seconds/divisor),unit);}

boot().catch(error=>{console.error(error);toast(error.message||t("requestFailed"),true);});

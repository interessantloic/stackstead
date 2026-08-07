const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  language: "zh-CN", settings: {}, user: null, dashboard: null, history: [],
  downloaders: [], devices: [], notifications: [], route: "overview", timer: null,
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
  featureSettings:"可选功能",featureSettingsLead:"关闭 IPv6 后会隐藏相关界面、停止后台检查并拒绝设备上报；已有记录不会删除。",welcomeLeadNoIpv6:"下载器与通知服务的实时状态。",copyFailed:"无法自动复制，请长按或选中文本后手动复制。"
});
Object.assign(translations.en, {
  optionalFeatures:"Choose optional features",optionalFeaturesLead:"Disabled features stay out of navigation and do not run background checks.",
  enableIpv6:"Enable IPv6 monitoring",enableIpv6Lead:"The Reporter detects public IPv6 addresses on each target NAS and securely reports them to Stackstead.",
  firstDeviceLead:"Creating a device generates a dedicated token that is shown once. Devices without IPv6 can still report normally with an empty address.",deviceNameOptional:"First device name (optional)",
  tokenOnlyOnce:"This is the device identity token, not an IPv6 address. Save it now; it is shown only once.",noFirstToken:"IPv6 is enabled. You can add a device later from the IPv6 page.",ipv6Skipped:"IPv6 monitoring is disabled. You can enable it later in Settings.",
  copyToken:"Copy token",copyCommand:"Copy command",reportCommandLead:"Download the Reporter on the target NAS, then schedule the command below. The script detects public IPv6 addresses automatically.",downloadReporter:"Download Reporter",
  featureSettings:"Optional features",featureSettingsLead:"Disabling IPv6 hides its UI, stops its background check, and rejects device reports. Existing history is preserved.",welcomeLeadNoIpv6:"Live status for downloaders and notifications.",copyFailed:"Automatic copy failed. Select the text and copy it manually."
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

async function boot() {
  bindGlobalEvents();
  const bootstrap = await api("/api/bootstrap");
  state.settings = bootstrap.settings;
  state.language = bootstrap.settings.language || "zh-CN";
  applyTranslations();
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
  showOnly("app-shell"); applyTranslations();
  $("#brand-name").textContent = state.settings.appName || "Stackstead"; $("#mobile-brand").textContent = state.settings.appName || "Stackstead";
  renderNav(); routeFromHash(); clearInterval(state.timer); state.timer = setInterval(() => state.route === "overview" && loadOverview(false), 5000);
}

function visibleNavItems() { return navItems.filter(([route]) => route !== "ipv6" || state.settings.ipv6Enabled); }

function renderNav() {
  $("#nav").innerHTML = visibleNavItems().map(([route,key,icon]) => `<button class="nav-item ${state.route===route?"active":""}" data-route="${route}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><span>${t(key)}</span></button>`).join("");
  $$(".nav-item").forEach(node => node.onclick = () => { location.hash = node.dataset.route; $(".sidebar").classList.remove("open"); });
}

function routeFromHash() {
  const route = location.hash.slice(1); state.route = visibleNavItems().some(item => item[0]===route) ? route : "overview";
  $$(".view").forEach(node => node.hidden = node.id !== `view-${state.route}`); renderNav(); renderRoute();
}

async function renderRoute() {
  try {
    if (state.route === "overview") await loadOverview();
    if (state.route === "traffic") await loadTraffic();
    if (state.route === "ipv6") await loadIPv6();
    if (state.route === "notifications") await loadNotifications();
    if (state.route === "settings") renderSettings();
  } catch (error) { toast(error.message, true); }
}

function pageHead(title, lead, action = "") { return `<header class="page-head"><div><h1>${esc(title)}</h1><p>${esc(lead)}</p></div><div class="actions">${action}</div></header>`; }

async function loadOverview(showLoading = true) {
  const view = $("#view-overview"); if (showLoading && !state.dashboard) view.innerHTML = `<div class="empty">${t("loading")}</div>`;
  const [dashboard, history] = await Promise.all([api("/api/dashboard"), api("/api/traffic/history?hours=24")]);
  state.dashboard = dashboard; state.history = history.items; state.settings = dashboard.settings;
  const totals = dashboard.traffic.totals; const ipv6 = dashboard.ipv6;
  const ipv6Stats = ipv6 ? `${stat(t("ipv6Devices"),String(ipv6.device_count||0),`${ipv6.active_24h||0} ${t("active24h")}`,"accent-purple")}${stat(t("lastChange"),ipv6.lastChangeAt?formatRelative(ipv6.lastChangeAt):t("never"),ipv6.lastChangeAt?formatDate(ipv6.lastChangeAt):"","")}` : "";
  view.innerHTML = pageHead(t("welcome"),t(ipv6 ? "welcomeLead" : "welcomeLeadNoIpv6"),`<button class="secondary" id="refresh-overview">↻ ${t("refresh")}</button>`) + `
    <div class="grid stats">
      ${stat(t("downloadSpeed"),formatSpeed(totals.downloadSpeed),`${dashboard.traffic.downloaders.length} ${t("downloaders")}`,"accent-green")}
      ${stat(t("uploadSpeed"),formatSpeed(totals.uploadSpeed),formatTime(dashboard.traffic.lastPolledAt),"accent-blue")}
      ${ipv6Stats}
    </div>
    <div class="grid main-grid">
      <section class="card chart-card"><div class="card-head"><h2>${t("trafficTrend")}</h2><div class="legend"><span><i style="background:#14a36f"></i>${t("downloadSpeed")}</span><span><i style="background:#2878ff"></i>${t("uploadSpeed")}</span></div></div>
        <div class="live-grid"><div class="speed-box download"><span>${t("todayDownload")}</span><strong>${formatBytes(totals.todayDownloadBytes)}</strong></div><div class="speed-box upload"><span>${t("todayUpload")}</span><strong>${formatBytes(totals.todayUploadBytes)}</strong></div></div>
        <div class="chart">${trafficChart(state.history)}</div>
      </section>
      <section class="card"><div class="card-head"><h2>${t("downloaders")}</h2><button class="ghost" data-go="traffic">${t("settings")} →</button></div><div class="list">${renderLiveDownloaders(dashboard.traffic.downloaders)}</div></section>
    </div>`;
  $("#refresh-overview").onclick = () => loadOverview(false); $("[data-go=traffic]").onclick = () => location.hash="traffic";
}

function stat(label,value,trend,extra) { return `<section class="card stat ${extra}"><span class="label">${esc(label)}</span><strong>${esc(value)}</strong><div class="trend">${esc(trend||"")}</div></section>`; }

function renderLiveDownloaders(items) {
  if (!items.length) return `<div class="empty">${t("noDownloaders")}</div>`;
  return items.map(item => `<div class="list-item"><div class="avatar" style="background:${esc(item.color)}20;color:${esc(item.color)}">${item.imageUrl?`<img src="${esc(item.imageUrl)}" alt="">`:esc(item.name.slice(0,2).toUpperCase())}</div><div class="item-main"><strong>${esc(item.name)}</strong><span>↓ ${formatSpeed(item.downloadSpeed)} · ↑ ${formatSpeed(item.uploadSpeed)}</span></div><div class="item-side"><span class="status ${item.status==='online'?'':'offline'}">${t(item.status==='online'?'online':'offline')}</span></div></div>`).join("");
}

function trafficChart(items) {
  if (items.length < 2) return `<div class="chart-empty">${t("waiting")}</div>`;
  const width=800,height=230,pad=12,max=Math.max(1,...items.flatMap(i=>[i.download_speed,i.upload_speed]));
  const points = key => items.map((item,index)=>`${pad+(index/(items.length-1))*(width-pad*2)},${height-pad-(Number(item[key])/max)*(height-pad*2)}`).join(" ");
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${t('trafficTrend')}"><defs><linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#14a36f" stop-opacity=".35"/><stop offset="1" stop-color="#14a36f" stop-opacity="0"/></linearGradient></defs><polyline points="${points('download_speed')}" fill="none" stroke="#14a36f" stroke-width="4" vector-effect="non-scaling-stroke"/><polyline points="${points('upload_speed')}" fill="none" stroke="#2878ff" stroke-width="4" vector-effect="non-scaling-stroke"/></svg>`;
}

async function loadTraffic() {
  const result = await api("/api/downloaders"); state.downloaders = result.items; const view=$("#view-traffic");
  view.innerHTML = pageHead(t("manageDownloaders"),t("manageDownloadersLead"),`<button class="primary" id="add-downloader">＋ ${t("addDownloader")}</button>`) + `<section class="card table-wrap"><table class="table"><thead><tr><th>${t("name")}</th><th>${t("type")}</th><th>${t("address")}</th><th>${t("status")}</th><th>${t("actions")}</th></tr></thead><tbody>${state.downloaders.map(d=>`<tr><td><div style="display:flex;align-items:center;gap:10px"><div class="avatar">${d.imageUrl?`<img src="${esc(d.imageUrl)}" alt="">`:esc(d.name.slice(0,2))}</div><strong>${esc(d.name)}</strong></div></td><td>${d.kind==='qbittorrent'?'qBittorrent':'Transmission'}</td><td class="mono">${esc(d.baseUrl)}</td><td><span class="status ${d.enabled?'':'offline'}">${d.enabled?t("enabled"):t("offline")}</span></td><td><button class="ghost" data-test-downloader="${d.id}">${t("test")}</button><button class="ghost" data-edit="${d.id}">${t("edit")}</button><button class="ghost" data-image="${d.id}">${t("image")}</button><button class="ghost" data-delete="${d.id}">${t("remove")}</button></td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">${t("noDownloaders")}</div></td></tr>`}</tbody></table></section>`;
  $("#add-downloader").onclick=()=>editDownloader(); $$('[data-test-downloader]').forEach(n=>n.onclick=()=>testDownloader(Number(n.dataset.testDownloader))); $$('[data-edit]').forEach(n=>n.onclick=()=>editDownloader(Number(n.dataset.edit))); $$('[data-delete]').forEach(n=>n.onclick=()=>removeDownloader(Number(n.dataset.delete))); $$('[data-image]').forEach(n=>n.onclick=()=>chooseImage(Number(n.dataset.image)));
}

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
  form.onsubmit=async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));values.enabled=$('[name=enabled]',form).checked;values.verify_tls=$('[name=verify_tls]',form).checked;if(item&& !values.password) values.password=null;try{await api(`/api/downloaders${item?`/${item.id}`:''}`,{method:item?'PUT':'POST',body:JSON.stringify(values)});$("#editor-dialog").close();toast(t("saved"));loadTraffic();}catch(error){toast(error.message,true);}};
  $('[data-close]',form).onclick=()=>$("#editor-dialog").close(); $("#editor-dialog").showModal();
}

function chooseImage(id) { const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp,image/gif";input.onchange=async()=>{if(!input.files[0])return;const body=new FormData();body.append("image",input.files[0]);try{await api(`/api/downloaders/${id}/image`,{method:"POST",body});toast(t("saved"));loadTraffic();}catch(error){toast(error.message,true);}};input.click(); }
async function removeDownloader(id) { if(!await confirmAction(t("confirmDelete"),t("deleteDownloaderText")))return;try{await api(`/api/downloaders/${id}`,{method:"DELETE"});toast(t("deleted"));loadTraffic();}catch(error){toast(error.message,true);} }
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

function renderSettings() {
  const s=state.settings;const view=$("#view-settings");
  view.innerHTML=pageHead(t("settings"),t("siteSettings"))+`<div class="settings-sections"><section class="card"><div class="card-head"><h2>${t("general")}</h2></div><form id="general-form" class="inline-form"><label><span>${t("appName")}</span><input name="app_name" value="${esc(s.appName||"")}" required></label><label><span>${t("language")}</span><select name="language"><option value="zh-CN" ${s.language==='zh-CN'?'selected':''}>简体中文</option><option value="en" ${s.language==='en'?'selected':''}>English</option></select></label><label><span>${t("timezone")}</span><input name="timezone" value="${esc(s.timezone||"Asia/Shanghai")}" required></label><button class="primary" type="submit">${t("save")}</button></form></section><section class="card"><div class="card-head"><div><h2>${t("featureSettings")}</h2><p class="muted">${t("featureSettingsLead")}</p></div></div><form id="features-form"><label class="feature-choice"><input class="toggle" name="ipv6_enabled" type="checkbox" ${s.ipv6Enabled?'checked':''}><span><strong>${t("enableIpv6")}</strong><small>${t("enableIpv6Lead")}</small></span></label><div class="dialog-actions"><button class="primary" type="submit">${t("save")}</button></div></form></section><section class="card"><div class="card-head"><h2>${t("security")}</h2></div><div class="actions"><button class="danger" id="logout">${t("signOut")}</button></div></section></div>`;
  $("#general-form").onsubmit=saveGeneral;$("#features-form").onsubmit=saveFeatures;$("#logout").onclick=logout;
}

async function saveGeneral(event){event.preventDefault();const values=Object.fromEntries(new FormData(event.target));try{const result=await api("/api/settings/general",{method:"PUT",body:JSON.stringify(values)});state.settings=result;state.language=result.language;applyTranslations();toast(t("saved"));showApp();}catch(error){toast(error.message,true);}}
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
function formatSpeed(value){return `${formatBytes(value)}/s`;}
function formatDate(value){if(!value)return t("never");return new Intl.DateTimeFormat(state.language,{dateStyle:"medium",timeStyle:"medium"}).format(new Date(value));}
function formatTime(value){if(!value)return t("waiting");return new Intl.DateTimeFormat(state.language,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date(value));}
function formatRelative(value){if(!value)return t("never");const seconds=Math.round((new Date(value)-Date.now())/1000);const abs=Math.abs(seconds);const unit=abs<60?"second":abs<3600?"minute":abs<86400?"hour":"day";const divisor={second:1,minute:60,hour:3600,day:86400}[unit];return new Intl.RelativeTimeFormat(state.language,{numeric:"auto"}).format(Math.round(seconds/divisor),unit);}

boot().catch(error=>{console.error(error);toast(error.message||t("requestFailed"),true);});

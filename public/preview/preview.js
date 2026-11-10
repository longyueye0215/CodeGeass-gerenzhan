/**
 * 虚拟设备工作台（外壳侧运行时）
 * ────────────────────────────────────────────────────────────
 * 架构分两层，互不侵入：
 *   · 本文件 = 外壳：设备参数、URL 构造、postMessage 指令、状态可视化
 *   · 站点侧 previewBridge = 运行时：只在被 iframe 嵌入时激活，接收指令并上报状态
 * 因此主站产物完全不需要为调试单独打包，线上与预览加载的是同一份 JS。
 *
 * 协议：{ source: 'lunar-preview', type, payload } → iframe
 *       { source: 'lunar-site',    type, payload } → 外壳
 * payload.sub 已预留，供 DocView 子页面路由化后做「歌单 / 小说 / 旅行画廊」深链。
 */
(function () {
  'use strict'

  var DEVICES = [
    { id: 'se',      name: 'iPhone SE 3',          w: 375, h: 667,  dpr: 2,   chrome: 'notch' },
    { id: '12',      name: 'iPhone 12 / 13 / 14',  w: 390, h: 844,  dpr: 3,   chrome: 'notch' },
    { id: '14pro',   name: 'iPhone 14 / 15 Pro',   w: 393, h: 852,  dpr: 3,   chrome: 'island' },
    { id: 'promax',  name: 'iPhone 15 Pro Max',    w: 430, h: 932,  dpr: 3,   chrome: 'island' },
    { id: 'pixel',   name: 'Pixel 7 / 8',          w: 412, h: 915,  dpr: 2.6, chrome: 'punch' },
    { id: 'android', name: 'Android 主流 360×800', w: 360, h: 800,  dpr: 3,   chrome: 'punch' },
    { id: 'mini',    name: 'iPad mini（竖）',      w: 744, h: 1133, dpr: 2,   chrome: 'none' },
    { id: 'fold',    name: '折叠屏内屏',           w: 717, h: 1020, dpr: 2.5, chrome: 'punch' },
    { id: 'custom',  name: '自定义…',              w: 390, h: 844,  dpr: 2,   chrome: 'none', custom: true }
  ]

  var SECTIONS = [
    { id: null,      label: '首页', no: '⌂', home: true },
    { id: 'slot-1',  label: '履历', no: '01' },
    { id: 'slot-2',  label: '小说', no: '02' },
    { id: 'slot-3',  label: '音乐', no: '03' },
    { id: 'slot-4',  label: '游戏', no: '04' },
    { id: 'slot-5',  label: '追番', no: '05' },
    { id: 'slot-6',  label: '旅行', no: '06' }
  ]

  var cfg = {
    device: '12',
    orient: 'portrait',
    zoom: 'fit',
    section: null,
    theme: 'dark',
    fast: true,
    skipLaunch: false,
    compare: false,
    chrome: true,
    nosw: false,
    sub: null,
    customW: 390,
    customH: 844
  }

  var $ = function (id) { return document.getElementById(id) }
  var phoneFrame = $('phone')
  var pcFrame = $('pc')
  var phoneDevice = $('phoneDevice')
  var pcDevice = $('pcDevice')
  var phoneHolder = $('phoneHolder')
  var pcHolder = $('pcHolder')
  var stage = $('stage')
  var connected = false
  var reloadAt = 0

  /* ───────────────── 设备与 URL ───────────────── */

  function currentDevice() {
    var d = DEVICES.filter(function (x) { return x.id === cfg.device })[0] || DEVICES[1]
    if (d.custom) return Object.assign({}, d, { w: Number(cfg.customW) || 390, h: Number(cfg.customH) || 844 })
    return d
  }

  function dimensions(d) {
    return cfg.orient === 'landscape' ? { w: d.h, h: d.w } : { w: d.w, h: d.h }
  }

  function siteUrl(mode) {
    var p = new URLSearchParams()
    p.set('mode', mode)
    p.set('preview', '1')
    if (cfg.fast) p.set('fast', '1')
    if (cfg.skipLaunch) p.set('skipLaunch', '1')
    if (cfg.section) p.set('section', cfg.section)
    if (cfg.theme === 'light') p.set('theme', 'light')
    if (cfg.nosw) p.set('nosw', '1')
    return '/?' + p.toString()
  }

  function absoluteUrl(mode) { return window.location.origin + siteUrl(mode) }

  /* ───────────────── 布局 ───────────────── */

  function layout() {
    var d = currentDevice()
    var m = dimensions(d)
    var w = m.w, h = m.h
    var s

    if (cfg.zoom === 'fit') {
      var availW = stage.clientWidth - 90
      var availH = stage.clientHeight - 130
      var slotW = cfg.compare ? Math.max(180, (availW - 40) / 2) : availW
      s = Math.min(1, slotW / (w + 24), Math.max(160, availH) / (h + 24))
      s = Math.max(0.18, Math.round(s * 100) / 100)
    } else {
      s = Number(cfg.zoom)
    }

    phoneDevice.style.setProperty('--w', w + 'px')
    phoneDevice.style.setProperty('--h', h + 'px')
    phoneDevice.style.transform = 'scale(' + s + ')'
    phoneHolder.style.width = Math.round(w * s) + 'px'
    phoneHolder.style.height = Math.round(h * s) + 'px'
    phoneDevice.dataset.chrome = cfg.chrome ? d.chrome : 'none'
    phoneDevice.classList.toggle('no-chrome', !cfg.chrome)

    $('phoneLabel').textContent =
      d.name + ' · ' + w + ' × ' + h + ' · DPR ' + d.dpr + ' · ' +
      (cfg.orient === 'landscape' ? '横屏' : '竖屏') + ' · ' + Math.round(s * 100) + '%'

    if (cfg.compare) {
      var pw = 1000, ph = 640
      var ps = Math.min(s, 0.55, Math.max(160, stage.clientHeight - 130) / (ph + 24))
      ps = Math.max(0.18, Math.round(ps * 100) / 100)
      pcDevice.style.setProperty('--w', pw + 'px')
      pcDevice.style.setProperty('--h', ph + 'px')
      pcDevice.style.transform = 'scale(' + ps + ')'
      pcHolder.style.width = Math.round(pw * ps) + 'px'
      pcHolder.style.height = Math.round(ph * ps) + 'px'
    }
  }

  /* ───────────────── 指令通道 ───────────────── */

  function send(frame, type, payload) {
    try {
      if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage(
          { source: 'lunar-preview', type: type, payload: payload || {} },
          window.location.origin
        )
      }
    } catch (e) { /* 跨域或已卸载时忽略 */ }
  }

  function broadcast(type, payload) {
    send(phoneFrame, type, payload)
    if (cfg.compare) send(pcFrame, type, payload)
  }

  function navigate(id) {
    cfg.section = id
    markPages()
    // 优先走站内导航（不重载、保留文档页内部滚动与主题状态）
    broadcast('navigate', { section: id, sub: cfg.sub })
    updateUrlText()
  }

  function reloadFrames() {
    reloadAt = Date.now()
    connected = false
    markConnection(false)
    // 每次重载换查询串，绕开浏览器 / Service Worker 对 HTML 的旧缓存
    var bust = '&_t=' + reloadAt
    phoneFrame.src = siteUrl('mobile') + bust
    if (cfg.compare) pcFrame.src = siteUrl('desktop') + bust
    else pcFrame.src = 'about:blank'
    updateUrlText()
  }

  /* ───────────────── 状态可视化 ───────────────── */

  function markConnection(on) {
    var el = $('conn')
    var label = on ? '设备已连接' : '等待设备连接'
    // 预热状态每 120ms 上报一次，避免无谓地重建这段 DOM
    if (connected === on && el.textContent.indexOf(label) >= 0) return
    connected = on
    el.classList.toggle('on', on)
    el.innerHTML = '<i></i> ' + label
    $('dot').classList.toggle('on', on)
  }

  function markPages() {
    Array.prototype.forEach.call($('pages').children, function (b) {
      b.classList.toggle('on', (b.dataset.section || '') === (cfg.section || ''))
    })
  }

  function updateUrlText() {
    $('urlText').textContent = absoluteUrl('mobile') + (connected ? '  ·  已同步' : '')
  }

  function sectionLabel(id) {
    var s = SECTIONS.filter(function (x) { return x.id === id })[0]
    return s ? s.label : (id || '未知')
  }

  function onState(p) {
    markConnection(true)
    var warm = p.prewarm || {}
    var done = warm.done || 0
    var total = warm.total || 0
    var pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0
    $('warmBar').style.width = pct + '%'
    $('warmNum').textContent = done + ' / ' + total
    $('warmPhase').textContent = (warm.phase || 'idle') + (warm.urgent ? ' · 紧急' : '')
    $('chunkState').textContent = warm.chunkReady ? '已就绪 ✓' : '预取中…'
    $('chunkState').style.color = warm.chunkReady ? 'var(--ok)' : 'var(--gold)'
    $('sectionState').textContent = sectionLabel(p.section)
    $('themeState').textContent = p.light ? '亮色' : '暗色'
    $('gateState').textContent = p.section
      ? (warm.groups && warm.groups['gate:' + p.section]
          ? (warm.groups['gate:' + p.section].ready
              ? '已就绪 ✓'
              : warm.groups['gate:' + p.section].done + '/' + warm.groups['gate:' + p.section].total)
          : '无清单')
      : '—'
    if (p.section && p.section !== cfg.section) {
      cfg.section = p.section
      markPages()
    }
    updateUrlText()
    // 标签页回显：切到别的窗口也能看到预热进度与当前分区
    document.title = 'RIG ' + sectionLabel(p.section) + ' · 预热 ' + pct + '%'
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== window.location.origin || !e.data || e.data.source !== 'lunar-site') return
    if (e.data.type === 'state') onState(e.data.payload)
    if (e.data.type === 'ready') {
      // 站点就绪后补齐当前分区 / 主题，避免 iframe 重载后状态漂移
      if (cfg.section) send(e.source === (pcFrame.contentWindow) ? pcFrame : phoneFrame, 'navigate', { section: cfg.section })
      send(e.source === (pcFrame.contentWindow) ? pcFrame : phoneFrame, 'theme', { theme: cfg.theme })
      send(e.source === (pcFrame.contentWindow) ? pcFrame : phoneFrame, 'ping')
    }
  })

  /* ───────────────── UI 绑定 ───────────────── */

  var deviceSel = $('device')
  DEVICES.forEach(function (d) {
    var o = document.createElement('option')
    o.value = d.id
    o.textContent = d.name + '  ' + d.w + '×' + d.h
    deviceSel.appendChild(o)
  })
  deviceSel.value = cfg.device
  deviceSel.addEventListener('change', function () {
    cfg.device = deviceSel.value
    $('customSize').hidden = !currentDevice().custom
    layout()
  })

  $('customW').addEventListener('change', function () { cfg.customW = Number(this.value); layout() })
  $('customH').addEventListener('change', function () { cfg.customH = Number(this.value); layout() })

  function bindSeg(id, key, after) {
    var box = $(id)
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]')
      if (!b) return
      Array.prototype.forEach.call(box.children, function (x) { x.classList.toggle('on', x === b) })
      cfg[key] = b.dataset.v
      if (after) after(cfg[key])
    })
  }
  bindSeg('orient', 'orient', layout)
  bindSeg('zoom', 'zoom', layout)
  bindSeg('theme', 'theme', function (v) {
    // 即时切换 + 写进 URL，下次刷新仍保持
    broadcast('theme', { theme: v })
    $('themeState').textContent = v === 'light' ? '亮色' : '暗色'
    updateUrlText()
  })

  var pages = $('pages')
  SECTIONS.forEach(function (s) {
    var b = document.createElement('button')
    b.type = 'button'
    b.dataset.section = s.id || ''
    if (s.home) b.className = 'home'
    b.innerHTML = '<span>' + s.no + '</span>' + s.label
    b.addEventListener('click', function () { navigate(s.id) })
    pages.appendChild(b)
  })
  markPages()

  $('fast').addEventListener('change', function () { cfg.fast = this.checked; reloadFrames() })
  $('skipLaunch').addEventListener('change', function () {
    cfg.skipLaunch = this.checked
    reloadFrames()
  })
  $('nosw').addEventListener('change', function () { cfg.nosw = this.checked; reloadFrames() })
  $('chrome').addEventListener('change', function () { cfg.chrome = this.checked; layout() })
  $('compare').addEventListener('change', function () {
    cfg.compare = this.checked
    $('pcUnit').hidden = !cfg.compare
    layout()
    if (cfg.compare) pcFrame.src = siteUrl('desktop') + '&_t=' + Date.now()
    else pcFrame.src = 'about:blank'
  })

  $('reload').addEventListener('click', reloadFrames)
  $('clearCache').addEventListener('click', function () {
    if (window.caches && caches.keys) {
      caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k) })) })
        .catch(function () {})
    }
    // 外壳侧已清空 Cache Storage，直接重载两个 iframe 即可
    window.setTimeout(reloadFrames, 250)
  })
  $('copyLink').addEventListener('click', function () {
    var t = absoluteUrl('mobile')
    var done = function () { this.textContent = '已复制 ✓'; var self = this; window.setTimeout(function () { self.textContent = '复制手机端链接' }, 1400) }
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done.bind($('copyLink')), function () {})
    else done.call($('copyLink'))
  })
  $('openNew').addEventListener('click', function () { window.open(absoluteUrl('mobile'), '_blank', 'noopener') })

  window.addEventListener('resize', function () { layout() })
  document.addEventListener('keydown', function (e) {
    var t = e.target
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return
    var k = e.key.toLowerCase()
    if (k >= '1' && k <= '6') navigate('slot-' + k)
    else if (k === '0' || k === 'h') navigate(null)
    else if (k === 'r') reloadFrames()
    else if (k === 'o') {
      cfg.orient = cfg.orient === 'portrait' ? 'landscape' : 'portrait'
      Array.prototype.forEach.call($('orient').children, function (x) { x.classList.toggle('on', x.dataset.v === cfg.orient) })
      layout()
    } else if (k === 'c') { $('compare').click() }
    else if (k === 'f') {
      cfg.zoom = 'fit'
      Array.prototype.forEach.call($('zoom').children, function (x) { x.classList.toggle('on', x.dataset.v === 'fit') })
      layout()
    }
  })

  function tickClock() {
    $('sbTime').textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  tickClock()
  window.setInterval(tickClock, 30000)

  // 启动
  layout()
  reloadFrames()
})()

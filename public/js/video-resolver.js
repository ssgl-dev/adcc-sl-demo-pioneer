/* ============================================================
   ADCC video-resolver.js — 文本→手语视频 映射解析器

   架构:
     1. 加载 /data/manifest.json 获取页面配置
     2. 根据当前页面 URL 匹配对应的数据文件
     3. 加载数据 JSON（如 /data/adcc_one.json）获取 文本→视频 映射表
     4. 扫描页面 DOM 中的文本段落
     5. 精确匹配文本 → 找到对应视频文件
     6. 为匹配的段落添加 ▶ 播放按钮
     7. 点击按钮 → 右下角浮动播放器播放对应手语视频

   扩展新页面:
     - 创建新的 JSON 映射文件放入 /data/
     - 在 /data/manifest.json 中添加条目
     - 将视频文件放入 /static/adcc_sign_language/videos/
   ============================================================ */

(function () {
  "use strict";

  // ==========================================================
  // 配置
  // ==========================================================
  const MANIFEST_URL = "/data/manifest.json";
  const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75];

  // ==========================================================
  // 状态
  // ==========================================================
  let videoBasePath = "/static/adcc_sign_language/videos/";
  let textToVideo = {};        // { "文本内容": "视频文件名.mp4" }
  let subtitleMap = {};        // { "视频文件名.mp4": "字幕文本" }
  let segments = [];            // [{ el, text, videoUrl, index }]
  let currentIdx = -1;
  let subtitleTimer = null;    // 打字机定时器
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  // ==========================================================
  // DOM 引用 (在 initUI 中填充)
  // ==========================================================
  let playerEl, videoEl, progressFill, timeCurrent, subtitleEl;
  let timeDuration, btnSpeed, btnExpand;
  let speedIdx = 0; // SPEED_OPTIONS[0] = 1x
  let sizeLevel = 1; // 0=sm 240px, 1=md 380px, 2=lg 560px

  // ==========================================================
  // 第1步: 加载 manifest.json
  // ==========================================================
  async function loadManifest() {
    try {
      const resp = await fetch(MANIFEST_URL);
      if (!resp.ok) {
        console.warn("video-resolver: 无法加载 manifest.json，跳过");
        return null;
      }
      const manifest = await resp.json();
      console.log("video-resolver: 加载 manifest.json 成功，共", manifest.pages?.length || 0, "个页面配置");

      // 使用全局 videoBasePath（如果有配置）
      if (manifest.videoBasePath) {
        videoBasePath = manifest.videoBasePath;
      }

      // 匹配当前页面（去除 .html 后缀做兼容匹配）
      const currentPage = window.location.pathname.split("/").pop() || "page_raw";
      const currentPageBase = currentPage.replace(/\.html$/, "");
      const pageConfig = manifest.pages?.find(p => {
        const base = p.pageMatch.replace(/\.html$/, "");
        return base === currentPageBase;
      });

      if (!pageConfig) {
        console.warn("video-resolver: 当前页面 '" + currentPage + "' 在 manifest.json 中未找到匹配配置");
        return null;
      }

      console.log("video-resolver: 匹配到页面配置:", pageConfig.id, "→", pageConfig.dataFile);
      return pageConfig;
    } catch (e) {
      console.error("video-resolver: 加载 manifest.json 失败:", e.message);
      return null;
    }
  }

  // ==========================================================
  // 第2步: 加载数据 JSON（文本→视频映射表）
  // ==========================================================
  async function loadMapping(dataFile) {
    try {
      const resp = await fetch(dataFile);
      if (!resp.ok) {
        console.warn("video-resolver: 无法加载数据文件:", dataFile);
        return null;
      }
      const data = await resp.json();
      const mapping = data.mapping || {};
      subtitleMap = data.subtitles || {};
      const count = Object.keys(mapping).length;
      console.log("video-resolver: 加载映射表成功，共", count, "条文本→视频映射，字幕", Object.keys(subtitleMap).length, "条");
      return mapping;
    } catch (e) {
      console.error("video-resolver: 加载数据文件失败:", e.message);
      return null;
    }
  }

  // ==========================================================
  // 第3步: 扫描页面上可匹配的文本段落
  // ==========================================================
  function findTextBlocks() {
    const items = [];

    function addBlock(el, text) {
      text = text.trim();
      if (!text) return;

      // 在映射表中查找
      const videoFile = textToVideo[text];
      if (videoFile) {
        items.push({
          el: el,
          text: text,
          videoUrl: videoBasePath + videoFile,
          index: items.length,
        });
      }
    }

    // 1. 页面标题 <h1 class="_content-title"> 内的 <span>
    const titleSpan = document.querySelector("h1._content-title span");
    if (titleSpan) {
      addBlock(titleSpan, titleSpan.textContent);
    }

    // 2. 日期 <div class="_date">
    const dateEl = document.querySelector("._content-title ._date");
    if (dateEl) {
      // 日期元素的 textContent 包含图标字符和日期文本，需要提取纯文本
      const dateText = dateEl.textContent.trim();
      if (dateText) {
        addBlock(dateEl, dateText);
      }
    }

    // 3. 正文内容区: 遍历 .fr-view 内的块级元素
    const BLOCK_TAGS = new Set(["P", "LI", "H1", "H2", "H3", "H4"]);
    const content = document.querySelector("div.fr-view");
    if (content) {
      const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: function (node) {
            const tag = node.tagName ? node.tagName.toUpperCase() : "";
            if (!BLOCK_TAGS.has(tag)) return NodeFilter.FILTER_SKIP;

            // 跳过空白段落（只有 &nbsp; 或空）
            const text = node.textContent.trim();
            if (!text || text === "\xa0") return NodeFilter.FILTER_SKIP;

            // 跳过被其他块级元素包裹的（避免重复）
            let p = node.parentElement;
            while (p && p !== content) {
              if (BLOCK_TAGS.has(p.tagName.toUpperCase())) return NodeFilter.FILTER_SKIP;
              p = p.parentElement;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      while (walker.nextNode()) {
        const el = walker.currentNode;
        const text = el.textContent.trim();
        if (text && text !== "\xa0") {
          addBlock(el, text);
        }
      }

      // 4. 扫描 .fr-view 内的图片 alt 文本
      const images = content.querySelectorAll("img");
      images.forEach(img => {
        const alt = (img.getAttribute("alt") || "").trim();
        if (alt) addBlock(img, alt);
      });
    }

    return items;
  }

  // ==========================================================
  // 第4步: 创建浮动视频播放器 UI
  // ==========================================================
  function createPlayer() {
    const el = document.createElement("div");
    el.className = "adcc-video-player";
    el.innerHTML = `
      <div class="adcc-subtitle" style="display:none"></div>
      <div class="adcc-video-body">
        <video preload="metadata" playsinline></video>
      </div>
      <button class="btn-close" title="关闭">✕</button>
      <div class="adcc-video-controls">
        <div class="progress-wrap">
          <div class="time-row">
            <span class="time-current">00:00</span>
            <span>/</span>
            <span class="time-duration">00:00</span>
          </div>
          <div class="progress-bar">
            <div class="fill" style="width:0%">
            </div>
          </div>
        </div>
        <button class="btn-speed" title="切换播放速度">0.75x</button>
        <div class="actions-row">
          <button class="btn-expand" title="放大">⛶</button>
        </div>
      </div>
    `;
    return el;
  }

  function initUI() {
    if (playerEl) return;
    playerEl = createPlayer();
    document.body.appendChild(playerEl);

    // 缓存引用
    videoEl      = playerEl.querySelector("video");
    subtitleEl   = playerEl.querySelector(".adcc-subtitle");
    timeCurrent  = playerEl.querySelector(".time-current");
    timeDuration = playerEl.querySelector(".time-duration");
    progressFill = playerEl.querySelector(".progress-bar .fill");
    btnSpeed     = playerEl.querySelector(".btn-speed");
    btnExpand    = playerEl.querySelector(".btn-expand");
    const closeBtn    = playerEl.querySelector(".btn-close");

    // 事件绑定
    btnSpeed.addEventListener("click", onSpeedClick);
    btnExpand.addEventListener("click", cycleSize);
    closeBtn.addEventListener("click", closePlayer);

    // 应用初始尺寸
    applySize();

    videoEl.addEventListener("loadedmetadata", () => {
      timeDuration.textContent = formatTime(videoEl.duration);
    });

    videoEl.addEventListener("timeupdate", onTimeUpdate);
    videoEl.addEventListener("ended", onVideoEnded);

    // 拖拽支持
    const dragHandle = playerEl.querySelector(".adcc-video-body");
    dragHandle.addEventListener("mousedown", onDragStart);
    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("mouseup", onDragEnd);
    dragHandle.addEventListener("touchstart", onDragStart, { passive: false });
    document.addEventListener("touchmove", onDragMove, { passive: false });
    document.addEventListener("touchend", onDragEnd);
  }

  // ==========================================================
  // 第5步: 为匹配的文本段落添加播放按钮
  // ==========================================================
  function addPlayButtons() {
    segments.forEach((item, i) => {
      const el = item.el;

      // 图片元素：包裹并添加覆盖层按钮
      if (el.tagName === "IMG") {
        if (el.parentElement && el.parentElement.classList.contains("adcc-img-block")) return;

        const wrapper = document.createElement("div");
        wrapper.className = "adcc-img-block adcc-speakable";
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        item.el = wrapper; // 更新引用到包裹层

        const overlay = document.createElement("div");
        overlay.className = "adcc-img-overlay";
        const btn = document.createElement("button");
        btn.className = "adcc-play-btn";
        btn.innerHTML = "▶";
        btn.title = "播放手語視頻";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          playSegment(i);
        });
        overlay.appendChild(btn);
        wrapper.appendChild(overlay);
        return;
      }

      el.classList.add("adcc-speakable");

      // 避免重复添加按钮
      if (el.querySelector(".adcc-play-btn")) return;

      const btn = document.createElement("button");
      btn.className = "adcc-play-btn";
      btn.innerHTML = "▶";
      btn.title = "播放手语视频";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        playSegment(i);
      });

      el.appendChild(btn);
    });
  }

  // ==========================================================
  // 播放控制
  // ==========================================================
  function playSegment(idx) {
    if (idx < 0 || idx >= segments.length) return;
    currentIdx = idx;

    const item = segments[idx];

    // 加载视频源
    if (videoEl.src !== window.location.origin + item.videoUrl &&
        videoEl.getAttribute("src") !== item.videoUrl) {
      videoEl.src = item.videoUrl;
      videoEl.load();
    }

    // 显示播放器
    playerEl.classList.add("active");
    playerEl.classList.remove("minimized");

    // 保持用户之前设定的播放速度（加载新视频后浏览器会重置 playbackRate）
    videoEl.playbackRate = SPEED_OPTIONS[speedIdx] + 0.25;

    videoEl.play().catch((e) => {
      console.warn("video-resolver: 视频播放失败:", e.message);
    });

    // 启动字幕
    const videoFile = item.videoUrl.split("/").pop();
    startSubtitle(videoFile);

    highlightSegment(idx);
    scrollToElementIfNeeded(item.el);
  }

  function onVideoEnded() {
    stopSubtitle();
    // 播放结束，停止，等待用户点击下一句
    highlightSegment(-1);
  }

  function onTimeUpdate() {
    if (!videoEl.duration) return;
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    progressFill.style.width = pct + "%";
    timeCurrent.textContent = formatTime(videoEl.currentTime);
  }

  function onSpeedClick() {
    speedIdx = (speedIdx + 1) % SPEED_OPTIONS.length;
    const speed = SPEED_OPTIONS[speedIdx];
    videoEl.playbackRate = speed + 0.25;
    btnSpeed.textContent = speed + "x";
  }

  // ==========================================================
  // 三级尺寸切换 (替代原来的 toggleExpand)
  // ==========================================================
  function cycleSize() {
    sizeLevel = (sizeLevel + 1) % 3;
    applySize();
  }

  function applySize() {
    playerEl.classList.remove("size-sm", "size-md", "size-lg");
    const labels = ["sm", "md", "lg"];
    const titles = ["放大 (当前: 小)", "放大 (当前: 中)", "缩小 (当前: 大)"];
    const icons  = ["⛶", "⛶", "⛯"];

    playerEl.classList.add("size-" + labels[sizeLevel]);
    btnExpand.title = titles[sizeLevel];
    btnExpand.textContent = icons[sizeLevel];

    // 重新定位到右下角，保证完整可见
    resetToBottomRight();
  }

  function resetToBottomRight() {
    playerEl.style.left = "auto";
    playerEl.style.top = "auto";
    playerEl.style.right = "20px";
    playerEl.style.bottom = "20px";
    // 确保不超出屏幕
    const rect = playerEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      playerEl.style.right = "0px";
      playerEl.style.left = (window.innerWidth - rect.width) + "px";
    }
    if (rect.bottom > window.innerHeight) {
      playerEl.style.bottom = "0px";
      playerEl.style.top = (window.innerHeight - rect.height) + "px";
    }
  }
  function onDragStart(e) {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = playerEl.getBoundingClientRect();
    dragOffset.x = clientX - rect.left;
    dragOffset.y = clientY - rect.top;
    playerEl.style.transition = "none";
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    playerEl.style.right = "auto";
    playerEl.style.bottom = "auto";
    playerEl.style.left = Math.max(0, Math.min(clientX - dragOffset.x, window.innerWidth - playerEl.offsetWidth)) + "px";
    playerEl.style.top = Math.max(0, Math.min(clientY - dragOffset.y, window.innerHeight - playerEl.offsetHeight)) + "px";
    e.preventDefault();
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    playerEl.style.transition = "opacity 0.3s, transform 0.3s";
  }

  // ==========================================================
  // 字幕（打字机效果）
  // ==========================================================
  function startSubtitle(videoFile) {
    stopSubtitle();
    const text = subtitleMap[videoFile];
    if (!text) return;

    // 等待视频加载完成获取时长
    function begin() {
      const duration = videoEl.duration;
      if (!duration || !isFinite(duration)) return;

      const totalChars = text.length;
      const interval = (duration * 250) / totalChars;

      subtitleEl.textContent = "";
      subtitleEl.style.display = "block";

      let charIdx = 0;
      subtitleTimer = setInterval(() => {
        if (charIdx < totalChars) {
          subtitleEl.textContent += text[charIdx];
          charIdx++;
        } else {
          clearInterval(subtitleTimer);
          subtitleTimer = null;
        }
      }, interval);
    }

    if (videoEl.readyState >= 1) {
      begin();
    } else {
      videoEl.addEventListener("loadedmetadata", begin, { once: true });
    }
  }

  function stopSubtitle() {
    if (subtitleTimer) {
      clearInterval(subtitleTimer);
      subtitleTimer = null;
    }
    if (subtitleEl) {
      subtitleEl.style.display = "none";
    }
  }

  // ==========================================================
  // UI 辅助
  // ==========================================================
  function closePlayer() {
    videoEl.pause();
    stopSubtitle();
    playerEl.classList.remove("active");
    highlightSegment(-1);
    currentIdx = -1;
  }

  function highlightSegment(idx) {
    segments.forEach((s, i) => {
      s.el.classList.toggle("speaking", i === idx);
      const btn = s.el.querySelector(".adcc-play-btn");
      if (btn) {
        if (i === idx) {
          btn.classList.add("playing");
          btn.innerHTML = "⏸";
        } else {
          btn.classList.remove("playing");
          btn.innerHTML = "▶";
        }
      }
    });
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function scrollToElementIfNeeded(el) {
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ==========================================================
  // 调试: 打印未匹配的文本（方便排查）
  // ==========================================================
  function logUnmatched() {
    const BLOCK_TAGS = new Set(["P", "LI", "H1", "H2", "H3", "H4"]);
    const content = document.querySelector("div.fr-view");
    if (!content) return;

    const walker = document.createTreeWalker(
      content,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function (node) {
          const tag = node.tagName ? node.tagName.toUpperCase() : "";
          if (!BLOCK_TAGS.has(tag)) return NodeFilter.FILTER_SKIP;
          const text = node.textContent.trim();
          if (!text || text === "\xa0") return NodeFilter.FILTER_SKIP;
          let p = node.parentElement;
          while (p && p !== content) {
            if (BLOCK_TAGS.has(p.tagName.toUpperCase())) return NodeFilter.FILTER_SKIP;
            p = p.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const unmatched = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text && !textToVideo[text]) {
        unmatched.push(text.substring(0, 60));
      }
    }

    if (unmatched.length > 0) {
      console.warn("video-resolver: 以下", unmatched.length, "个段落未在映射表中找到匹配:");
      unmatched.forEach((t, i) => console.warn(`  ${i + 1}. "${t}..."`));
    }
  }

  // ==========================================================
  // 启动入口
  // ==========================================================
  async function init() {
    console.log("video-resolver: 开始初始化...");

    // 1. 加载 manifest
    const pageConfig = await loadManifest();
    if (!pageConfig) {
      console.log("video-resolver: 当前页面无配置，跳过");
      return;
    }

    // 2. 加载文本→视频映射表
    const mapping = await loadMapping(pageConfig.dataFile);
    if (!mapping) {
      console.warn("video-resolver: 映射表为空，跳过");
      return;
    }
    textToVideo = mapping;

    // 使用页面级别的 videoBasePath（如果有）
    if (pageConfig.videoBasePath) {
      videoBasePath = pageConfig.videoBasePath;
    }

    // 3. 扫描页面文本并匹配
    segments = findTextBlocks();
    if (segments.length === 0) {
      console.warn("video-resolver: 页面上未找到任何匹配的文本段落");
      logUnmatched();
      return;
    }
    console.log("video-resolver: 成功匹配", segments.length, "个文本段落 → 视频");

    // 4. 初始化播放器 UI
    initUI();

    // 5. 添加播放按钮
    addPlayButtons();

    // 6. 调试: 打印未匹配的文本
    logUnmatched();

    console.log("video-resolver: 初始化完成 ✅");
  }

  // ==========================================================
  // DOM Ready 后启动
  // ==========================================================
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
